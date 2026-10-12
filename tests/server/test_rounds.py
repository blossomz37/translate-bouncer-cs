from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from server.config import IngestionConfig
from server.docx_io import ParsedDoc, Paragraph
from server.errors import RecoverableError
from server.ingest import ingest_book
from server.rounds import (
    render_editor_prompt,
    render_reviewer_prompt,
    run_editor_pass,
)


@pytest.fixture
def ingested(translate_root: Path, fixtures_dir: Path):
    return ingest_book(
        translated_path=fixtures_dir / "sample-fr-folder",
        english_path=fixtures_dir / "sample-en-folder",
        language_pair=("en", "fr"),
        ingestion=IngestionConfig(),
    )


def test_render_editor_prompt_substitutes_target_language():
    rendered = render_editor_prompt(
        template="Translate to {TARGET_LANG_NAME}; return {TARGET_LANG_CODE}: lines.",
        target_code="fr",
    )
    assert rendered == "Translate to French; return FR: lines."


def test_render_reviewer_prompt_substitutes_target_language():
    rendered = render_reviewer_prompt(
        template="reviewing {TARGET_LANG_NAME}",
        target_code="es",
    )
    assert rendered == "reviewing Spanish"


async def test_run_editor_pass_writes_round_files(ingested) -> None:
    en = ParsedDoc(paragraphs=[
        Paragraph(style="heading-1", text="Chapter 1"),
        Paragraph(style="normal", text="Hello."),
    ])
    tr = ParsedDoc(paragraphs=[
        Paragraph(style="heading-1", text="Chapitre 1"),
        Paragraph(style="normal", text="Bonjour."),
    ])

    fake_response = "[1]\nFR: # Chapitre Un\n\n[2]\nFR: Salut.\n"
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value=fake_response)

    result = await run_editor_pass(
        client=fake_client,
        slug=ingested.slug,
        chapter_n=1,
        round_n=1,
        en_doc=en,
        target_doc=tr,
        source_code="en",
        target_code="fr",
        editor_prompt_template="be brief, target {TARGET_LANG_NAME}",
        prior_reviewer_suggestions=None,
        model="anthropic/claude-sonnet-4",
    )
    assert result.paragraphs[0].style == "heading-1"
    assert result.paragraphs[0].text == "Chapitre Un"
    # Round files written.
    chdir = Path(ingested.book_dir) / "chapters" / "ch01"
    assert (chdir / "round-1-editor.docx").exists()
    assert (chdir / "round-1-editor.json").exists()


async def test_run_editor_pass_raises_recoverable_on_paragraph_count_mismatch(ingested) -> None:
    en = ParsedDoc(paragraphs=[Paragraph(style="normal", text="a"), Paragraph(style="normal", text="b")])
    tr = ParsedDoc(paragraphs=[Paragraph(style="normal", text="a"), Paragraph(style="normal", text="b")])
    bad_response = "[1]\nFR: only one\n"  # missing block 2
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value=bad_response)
    with pytest.raises(RecoverableError):
        await run_editor_pass(
            client=fake_client,
            slug=ingested.slug, chapter_n=1, round_n=1,
            en_doc=en, target_doc=tr,
            source_code="en", target_code="fr",
            editor_prompt_template="x",
            prior_reviewer_suggestions=None,
            model="m",
        )


import json as _json

from server.rounds import (
    render_translate_prompt,
    run_dossier_pass,
    run_reviewer_pass,
    run_simplification_pass,
    run_translation_pass,
)


def test_render_translate_prompt_substitutes_both_languages():
    rendered = render_translate_prompt(
        template="{SOURCE_LANG_NAME} ({SOURCE_LANG_CODE}) to {TARGET_LANG_NAME} ({TARGET_LANG_CODE})",
        source_code="en",
        target_code="pt-BR",
    )
    assert rendered == "English (EN) to Brazilian Portuguese (PT-BR)"


async def test_run_reviewer_pass_persists_suggestions(ingested) -> None:
    en = ParsedDoc(paragraphs=[Paragraph(style="normal", text="Hello.")])
    tr = ParsedDoc(paragraphs=[Paragraph(style="normal", text="Bonjour.")])
    suggestions_json = '[{"quote": "Bonjour.", "comment": "consider Salut"}]'
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value=suggestions_json)

    result = await run_reviewer_pass(
        client=fake_client,
        slug=ingested.slug,
        chapter_n=1,
        round_n=1,
        en_doc=en,
        target_doc=tr,
        source_code="en",
        target_code="fr",
        reviewer_prompt_template="x",
        model="openai/gpt-5",
    )
    assert result.suggestions[0].quote == "Bonjour."
    f = Path(ingested.book_dir) / "chapters" / "ch01" / "round-1-reviewer.json"
    assert f.exists()
    data = _json.loads(f.read_text())
    assert data["raw_response"] == suggestions_json


async def test_run_reviewer_pass_keeps_raw_when_parse_fails(ingested) -> None:
    en = ParsedDoc(paragraphs=[Paragraph(style="normal", text="Hello.")])
    tr = ParsedDoc(paragraphs=[Paragraph(style="normal", text="Bonjour.")])
    bad_json = "this is not JSON at all"
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value=bad_json)

    result = await run_reviewer_pass(
        client=fake_client,
        slug=ingested.slug, chapter_n=1, round_n=1,
        en_doc=en, target_doc=tr,
        source_code="en", target_code="fr",
        reviewer_prompt_template="x",
        model="m",
    )
    assert result.suggestions == []
    assert result.raw_response == bad_json


async def test_run_simplification_pass_writes_json_and_restores_styles(ingested) -> None:
    en = ParsedDoc(paragraphs=[
        Paragraph(style="heading-2", text="Part One"),
        Paragraph(style="normal", text="The quick brown fox."),
    ])
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value="[1]\nEN: Part One\n\n[2]\nEN: The fast fox.\n")

    result = await run_simplification_pass(
        client=fake_client,
        slug=ingested.slug, chapter_n=1,
        en_doc=en, source_code="en",
        simplifier_prompt_template="x",
        model="m",
    )
    assert [p.text for p in result.paragraphs] == ["Part One", "The fast fox."]
    # Styles come from the source by index, so heading-2 survives the pass.
    assert [p.style for p in result.paragraphs] == ["heading-2", "normal"]
    f = Path(ingested.book_dir) / "chapters" / "ch01" / "draft-simplified.json"
    assert f.exists()


async def test_run_dossier_pass_persists_markdown(ingested) -> None:
    simplified = ParsedDoc(paragraphs=[Paragraph(style="normal", text="Hello.")])
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value="## Dossier\n\nNothing tricky here.")

    result = await run_dossier_pass(
        client=fake_client,
        slug=ingested.slug, chapter_n=1,
        simplified_doc=simplified,
        source_code="en", target_code="fr",
        dossier_prompt_template="x",
        model="m",
    )
    assert result.startswith("## Dossier")
    f = Path(ingested.book_dir) / "chapters" / "ch01" / "draft-dossier.md"
    assert f.read_text() == result


async def test_run_translation_pass_manufactures_source_draft(ingested) -> None:
    simplified = ParsedDoc(paragraphs=[
        Paragraph(style="heading-1", text="Chapter 1"),
        Paragraph(style="normal", text="The fast fox."),
    ])
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(
        return_value="[1]\nFR: # Chapitre 1\n\n[2]\nFR: Le renard rapide.\n"
    )

    result = await run_translation_pass(
        client=fake_client,
        slug=ingested.slug, chapter_n=1,
        simplified_doc=simplified,
        dossier="## Dossier\n\nFox = renard.",
        source_code="en", target_code="fr",
        translator_prompt_template="x",
        model="m",
    )
    assert [p.text for p in result.paragraphs] == ["Chapitre 1", "Le renard rapide."]
    stdir = Path(ingested.book_dir) / "source-translated"
    assert (stdir / "ch01.json").exists()
    assert (stdir / "ch01.docx").exists()
    # The dossier is sent along with the payload.
    sent_user = fake_client.chat.call_args.kwargs["user"]
    assert "Fox = renard." in sent_user


async def test_run_translation_pass_rejects_empty_paragraphs(ingested) -> None:
    simplified = ParsedDoc(paragraphs=[Paragraph(style="normal", text="Hello.")])
    fake_client = AsyncMock()
    fake_client.chat = AsyncMock(return_value="[1]\nFR:\n")
    with pytest.raises(RecoverableError, match="empty paragraphs"):
        await run_translation_pass(
            client=fake_client,
            slug=ingested.slug, chapter_n=1,
            simplified_doc=simplified,
            dossier="d",
            source_code="en", target_code="fr",
            translator_prompt_template="x",
            model="m",
        )
