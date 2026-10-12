"""Parse .txt and .md files -> ParsedDoc.

Same conventions as docx_io: each paragraph carries a style
("heading-1" .. "heading-6" or "normal") and inline *italic* /
**bold** markers pass through untouched.

- Paragraphs are separated by blank lines; single newlines inside a
  paragraph are joined with a space (Markdown semantics).
- Markdown `#` .. `######` prefixes (followed by a space) map to
  heading levels; anything else is a normal paragraph.
- Only the prose subset of Markdown is supported: headings, bold,
  italic. Other constructs (lists, links, tables, code) are kept as
  literal text.
"""
from __future__ import annotations

import re
from pathlib import Path

from server.docx_io import Paragraph, ParsedDoc

_MD_HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")


def _read_text(path: Path | str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(f"cannot decode {path}: expected UTF-8 text") from exc


def _split_blocks(text: str) -> list[str]:
    """Split text into paragraphs on blank lines; join wrapped lines."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    blocks: list[str] = []
    for raw in re.split(r"\n\s*\n", normalized):
        joined = " ".join(line.strip() for line in raw.split("\n")).strip()
        if joined:
            blocks.append(joined)
    return blocks


def parse_txt(path: Path | str) -> ParsedDoc:
    """Parse a plain-text file: every blank-line-separated block is normal."""
    return ParsedDoc(
        paragraphs=[Paragraph(style="normal", text=b) for b in _split_blocks(_read_text(path))]
    )


def parse_md(path: Path | str) -> ParsedDoc:
    """Parse a Markdown file: `#` prefixes become headings, rest is normal."""
    paras: list[Paragraph] = []
    for block in _split_blocks(_read_text(path)):
        m = _MD_HEADING.match(block)
        if m and m.group(2):
            paras.append(Paragraph(style=f"heading-{len(m.group(1))}", text=m.group(2)))
        else:
            paras.append(Paragraph(style="normal", text=block))
    return ParsedDoc(paragraphs=paras)
