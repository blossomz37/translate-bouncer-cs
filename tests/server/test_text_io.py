from __future__ import annotations

from pathlib import Path

import pytest

from server.text_io import parse_md, parse_txt


def test_parse_txt_splits_on_blank_lines(tmp_path: Path) -> None:
    p = tmp_path / "book.txt"
    p.write_text("First paragraph.\n\nSecond paragraph.\n\n   \nThird.\n")
    parsed = parse_txt(p)
    assert [para.text for para in parsed.paragraphs] == [
        "First paragraph.",
        "Second paragraph.",
        "Third.",
    ]
    assert all(para.style == "normal" for para in parsed.paragraphs)


def test_parse_txt_joins_single_newlines(tmp_path: Path) -> None:
    p = tmp_path / "wrapped.txt"
    p.write_text("A wrapped\nline of prose.\n\nNext paragraph.\n")
    parsed = parse_txt(p)
    assert [para.text for para in parsed.paragraphs] == [
        "A wrapped line of prose.",
        "Next paragraph.",
    ]


def test_parse_txt_handles_bom_and_unicode(tmp_path: Path) -> None:
    p = tmp_path / "unicode.txt"
    p.write_bytes(b"\xef\xbb\xbfCaf\xc3\xa9 \xe2\x80\x94 na\xc3\xafve.\n")
    parsed = parse_txt(p)
    assert [para.text for para in parsed.paragraphs] == ["Café — naïve."]


def test_parse_txt_rejects_non_utf8(tmp_path: Path) -> None:
    p = tmp_path / "latin1.txt"
    p.write_bytes(b"Caf\xe9.\n")  # latin-1, invalid UTF-8
    with pytest.raises(ValueError, match="expected UTF-8"):
        parse_txt(p)


def test_parse_md_headings_map_to_levels(tmp_path: Path) -> None:
    p = tmp_path / "book.md"
    p.write_text("# Title\n\nBody.\n\n### Deep ##\n")
    parsed = parse_md(p)
    assert [(para.style, para.text) for para in parsed.paragraphs] == [
        ("heading-1", "Title"),
        ("normal", "Body."),
        ("heading-3", "Deep"),
    ]


def test_parse_md_hash_without_space_stays_normal(tmp_path: Path) -> None:
    p = tmp_path / "hash.md"
    p.write_text("#Title is prose.\n")
    parsed = parse_md(p)
    assert [(para.style, para.text) for para in parsed.paragraphs] == [
        ("normal", "#Title is prose.")
    ]


def test_parse_md_bold_italic_pass_through(tmp_path: Path) -> None:
    p = tmp_path / "marks.md"
    p.write_text("A *soft* word and a **strong** one.\n")
    parsed = parse_md(p)
    assert [para.text for para in parsed.paragraphs] == [
        "A *soft* word and a **strong** one."
    ]


def test_parse_md_empty_file_yields_no_paragraphs(tmp_path: Path) -> None:
    p = tmp_path / "empty.md"
    p.write_text("\n\n   \n")
    assert parse_md(p).paragraphs == []
    t = tmp_path / "empty.txt"
    t.write_text("")
    assert parse_txt(t).paragraphs == []
