from __future__ import annotations

from pathlib import Path

import pytest

from server.ingest import (
    ChapterCountMismatch,
    SourceFormat,
    detect_format,
    ingest_book,
)


def test_detect_format_folder(fixtures_dir: Path) -> None:
    assert detect_format(fixtures_dir / "sample-en-folder") == SourceFormat.FOLDER


def test_detect_format_single_docx(fixtures_dir: Path) -> None:
    assert detect_format(fixtures_dir / "sample-en-whole.docx") == SourceFormat.SINGLE_DOCX


def test_detect_format_empty_folder_raises(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="no .docx"):
        detect_format(tmp_path)


def test_detect_format_unknown_path_raises(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        detect_format(tmp_path / "nope")


from server.ingest import read_chapters
from server.config import IngestionConfig


def test_read_chapters_from_folder_returns_three(fixtures_dir: Path) -> None:
    cfg = IngestionConfig()
    chapters = read_chapters(fixtures_dir / "sample-en-folder", cfg)
    assert len(chapters) == 3
    # Folder ingestion uses the filename (without extension) as the title.
    assert [c.title for c in chapters] == ["ch01", "ch02", "ch03"]


def test_read_chapters_from_single_docx_returns_three(fixtures_dir: Path) -> None:
    cfg = IngestionConfig()
    chapters = read_chapters(fixtures_dir / "sample-en-whole.docx", cfg)
    assert len(chapters) == 3
    assert [c.title for c in chapters] == ["Chapter 1", "Chapter 2", "Chapter 3"]


def test_ingest_book_writes_source_folders_and_meta(fixtures_dir: Path, translate_root: Path) -> None:
    result = ingest_book(
        translated_path=fixtures_dir / "sample-fr-folder",
        english_path=fixtures_dir / "sample-en-folder",
        language_pair=("en", "fr"),
        ingestion=IngestionConfig(),
    )
    assert result.slug == "sample-fr-folder"
    book_dir = translate_root / result.slug
    assert (book_dir / "source-en" / "ch01.docx").exists()
    assert (book_dir / "source-en" / "ch01.json").exists()
    assert (book_dir / "source-translated" / "ch01.docx").exists()
    assert (book_dir / "source-translated" / "ch01.json").exists()
    # Three chapters total.
    assert len(list((book_dir / "source-en").glob("ch*.docx"))) == 3
    assert len(list((book_dir / "source-translated").glob("ch*.docx"))) == 3


def test_ingest_book_raises_on_chapter_count_mismatch(
    fixtures_dir: Path, translate_root: Path, tmp_path: Path
) -> None:
    # Build an EN folder with only 2 chapters.
    short = tmp_path / "short-en"
    short.mkdir()
    for f in sorted((fixtures_dir / "sample-en-folder").iterdir())[:2]:
        (short / f.name).write_bytes(f.read_bytes())
    with pytest.raises(ChapterCountMismatch) as exc:
        ingest_book(
            translated_path=fixtures_dir / "sample-fr-folder",
            english_path=short,
            language_pair=("en", "fr"),
            ingestion=IngestionConfig(),
        )
    assert exc.value.en_count == 2
    assert exc.value.tr_count == 3


def test_detect_format_single_txt_and_md(tmp_path: Path) -> None:
    txt = tmp_path / "book.txt"
    txt.write_text("Hello.\n")
    md = tmp_path / "book.md"
    md.write_text("# Hello\n")
    assert detect_format(txt) == SourceFormat.SINGLE_TXT
    assert detect_format(md) == SourceFormat.SINGLE_MD


def test_detect_format_folder_of_md(tmp_path: Path) -> None:
    d = tmp_path / "chapters"
    d.mkdir()
    (d / "ch01.md").write_text("# One\n")
    assert detect_format(d) == SourceFormat.FOLDER


def test_detect_format_unsupported_suffix_raises(tmp_path: Path) -> None:
    p = tmp_path / "book.pdf"
    p.write_text("not a book\n")
    with pytest.raises(ValueError, match="unsupported source"):
        detect_format(p)


def test_read_chapters_from_single_md_splits_on_headings(tmp_path: Path) -> None:
    p = tmp_path / "whole.md"
    p.write_text(
        "# Chapter 1\n\nBody one.\n\n# Chapter 2\n\nBody two.\n\n# Chapter 3\n\nBody three.\n"
    )
    chapters = read_chapters(p, IngestionConfig())
    assert [c.title for c in chapters] == ["Chapter 1", "Chapter 2", "Chapter 3"]
    assert chapters[0].doc.paragraphs[0].style == "heading-1"


def test_read_chapters_from_single_txt_falls_back_to_patterns(tmp_path: Path) -> None:
    p = tmp_path / "whole.txt"
    p.write_text("Chapter 1\n\nBody one.\n\nChapter 2\n\nBody two.\n")
    chapters = read_chapters(p, IngestionConfig())
    assert [c.title for c in chapters] == ["Chapter 1", "Chapter 2"]


def test_read_chapters_from_txt_folder_uses_stems(tmp_path: Path) -> None:
    d = tmp_path / "chapters"
    d.mkdir()
    (d / "ch01.txt").write_text("First.\n")
    (d / "ch02.txt").write_text("Second.\n")
    chapters = read_chapters(d, IngestionConfig())
    assert [c.title for c in chapters] == ["ch01", "ch02"]


def test_ingest_book_with_md_folders_writes_docx_and_meta(tmp_path: Path, translate_root: Path) -> None:
    import json

    en = tmp_path / "en-md"
    en.mkdir()
    (en / "ch01.md").write_text("# Chapter 1\n\nMorning *light*.\n")
    (en / "ch02.md").write_text("# Chapter 2\n\nEvening **dark**.\n")
    tr = tmp_path / "fr-md"
    tr.mkdir()
    (tr / "ch01.md").write_text("# Chapitre 1\n\nLumière du matin.\n")
    (tr / "ch02.md").write_text("# Chapitre 2\n\nNuit tombante.\n")
    result = ingest_book(
        translated_path=tr,
        english_path=en,
        language_pair=("en", "fr"),
        ingestion=IngestionConfig(),
    )
    book_dir = translate_root / result.slug
    assert len(list((book_dir / "source-en").glob("ch*.docx"))) == 2
    assert len(list((book_dir / "source-translated").glob("ch*.docx"))) == 2
    ch01 = json.loads((book_dir / "source-en" / "ch01.json").read_text())
    assert ch01["paragraphs"][0] == {"style": "heading-1", "text": "Chapter 1"}
    assert ch01["paragraphs"][1] == {"style": "normal", "text": "Morning *light*."}
    meta = json.loads((book_dir / "meta.json").read_text())
    assert meta["sources"]["english"]["format"] == "folder"
    assert [c["title"] for c in meta["chapters"]] == ["ch01", "ch02"]


def test_ingest_book_uses_existing_slug_with_suffix_on_collision(
    fixtures_dir: Path, translate_root: Path
) -> None:
    first = ingest_book(
        translated_path=fixtures_dir / "sample-fr-folder",
        english_path=fixtures_dir / "sample-en-folder",
        language_pair=("en", "fr"),
        ingestion=IngestionConfig(),
    )
    second = ingest_book(
        translated_path=fixtures_dir / "sample-fr-folder",
        english_path=fixtures_dir / "sample-en-folder",
        language_pair=("en", "fr"),
        ingestion=IngestionConfig(),
        on_collision="new-session",
    )
    assert second.slug == first.slug + "-2"
    assert (translate_root / second.slug).exists()
