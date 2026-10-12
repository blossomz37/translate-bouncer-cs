"""Book ingestion: detect format, split chapters, pair English with translated, write source folders."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import List, Literal, Tuple

from server.chapter_split import SplitChapter, split_docx, split_parsed
from server.config import IngestionConfig
from server.docx_io import parse_docx, write_docx
from server.text_io import parse_md, parse_txt
from server.paths import book_dir as _book_dir
from server.paths import translate_root as _translate_root
from server.slug import derive_slug


class SourceFormat(str, Enum):
    FOLDER = "folder"
    SINGLE_DOCX = "single-docx"
    SINGLE_TXT = "single-txt"
    SINGLE_MD = "single-md"


_PARSERS = {
    ".docx": parse_docx,
    ".txt": parse_txt,
    ".md": parse_md,
}


class ChapterCountMismatch(Exception):
    def __init__(self, en_count: int, tr_count: int, en_titles: List[str], tr_titles: List[str]):
        self.en_count = en_count
        self.tr_count = tr_count
        self.en_titles = en_titles
        self.tr_titles = tr_titles
        super().__init__(
            f"English: {en_count} chapters | Translated: {tr_count} chapters"
        )


@dataclass
class IngestResult:
    slug: str
    # Translated chapters when supplied, else the English chapters.
    chapters: List[SplitChapter]
    book_dir: Path


def detect_format(path: Path | str) -> SourceFormat:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(p)
    if p.is_dir():
        if not any(child.suffix.lower() in _PARSERS for child in p.iterdir()):
            raise ValueError(f"no .docx, .txt, or .md files in {p}")
        return SourceFormat.FOLDER
    if p.suffix.lower() == ".docx":
        return SourceFormat.SINGLE_DOCX
    if p.suffix.lower() == ".txt":
        return SourceFormat.SINGLE_TXT
    if p.suffix.lower() == ".md":
        return SourceFormat.SINGLE_MD
    raise ValueError(f"unsupported source: {p}")


def read_chapters(source: Path | str, ingestion: IngestionConfig) -> List[SplitChapter]:
    """Return ordered chapters from a folder of book files or one whole-book file."""
    fmt = detect_format(source)
    p = Path(source)
    if fmt == SourceFormat.FOLDER:
        files = sorted(child for child in p.iterdir() if child.suffix.lower() in _PARSERS)
        return [SplitChapter(title=f.stem, doc=_PARSERS[f.suffix.lower()](f)) for f in files]
    if fmt == SourceFormat.SINGLE_DOCX:
        return split_docx(
            p,
            heading_style=ingestion.heading_style,
            fallback_patterns=ingestion.fallback_patterns,
        )
    # single-txt / single-md
    parsed = _PARSERS[p.suffix.lower()](p)
    return split_parsed(
        parsed,
        heading_style=ingestion.heading_style,
        fallback_patterns=ingestion.fallback_patterns,
        source=f"{p!r}",
    )


def _next_free_slug(base: str) -> str:
    """Return base if it doesn't exist; otherwise return base-2, base-3, etc."""
    root = _translate_root()
    if not (root / base).exists():
        return base
    n = 2
    while (root / f"{base}-{n}").exists():
        n += 1
    return f"{base}-{n}"


def _now() -> str:
    """Return current UTC time in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


def ingest_book(
    *,
    translated_path: Path | None,
    english_path: Path,
    language_pair: Tuple[str, str],
    ingestion: IngestionConfig,
    on_collision: Literal["resume", "new-session"] = "new-session",
) -> IngestResult:
    """Ingest an English original, optionally with its translated counterpart.

    When translated_path is None, only source-en/ is written; chapter drafts
    are manufactured later per chapter by the translate pipeline.

    Side effects: writes <book-slug>/source-en/,
    <book-slug>/source-translated/ (when supplied), and <book-slug>/meta.json.
    """
    en_chapters = read_chapters(english_path, ingestion)
    tr_chapters = (
        read_chapters(translated_path, ingestion) if translated_path is not None else None
    )
    if tr_chapters is not None and len(en_chapters) != len(tr_chapters):
        raise ChapterCountMismatch(
            en_count=len(en_chapters),
            tr_count=len(tr_chapters),
            en_titles=[c.title for c in en_chapters],
            tr_titles=[c.title for c in tr_chapters],
        )

    base_slug = derive_slug((translated_path or english_path).name)
    if on_collision == "new-session":
        slug = _next_free_slug(base_slug)
    else:  # resume
        slug = base_slug
    bdir = _book_dir(slug)
    (bdir / "source-en").mkdir(parents=True, exist_ok=True)
    (bdir / "chapters").mkdir(parents=True, exist_ok=True)

    for n, en in enumerate(en_chapters, start=1):
        name = f"ch{n:02d}"
        write_docx(en.doc, bdir / "source-en" / f"{name}.docx")
        (bdir / "source-en" / f"{name}.json").write_text(en.doc.model_dump_json(indent=2))
    if tr_chapters is not None:
        (bdir / "source-translated").mkdir(parents=True, exist_ok=True)
        for n, tr in enumerate(tr_chapters, start=1):
            name = f"ch{n:02d}"
            write_docx(tr.doc, bdir / "source-translated" / f"{name}.docx")
            (bdir / "source-translated" / f"{name}.json").write_text(
                tr.doc.model_dump_json(indent=2)
            )

    title_chapters = tr_chapters if tr_chapters is not None else en_chapters
    tr_source: dict[str, str | None]
    if translated_path is not None:
        tr_source = {"path": str(translated_path), "format": detect_format(translated_path).value}
    else:
        tr_source = {"path": None, "format": "generated"}
    meta = {
        "slug": slug,
        "created_at": _now(),
        "sources": {
            "translated": tr_source,
            "english":    {"path": str(english_path),    "format": detect_format(english_path).value},
        },
        "language_pair": {"from": language_pair[0], "to": language_pair[1]},
        "chapters": [
            {"n": n, "title": c.title, "status": "untouched"}
            for n, c in enumerate(title_chapters, start=1)
        ],
    }
    (bdir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return IngestResult(
        slug=slug,
        chapters=tr_chapters if tr_chapters is not None else en_chapters,
        book_dir=bdir,
    )
