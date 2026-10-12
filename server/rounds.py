"""Editor and Reviewer round passes, plus Simplify/Dossier/Translate pre-passes."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from server.docx_io import Paragraph, ParsedDoc, write_docx
from server.errors import RecoverableError
from server.openrouter import OpenRouterClient
from server.paths import book_dir
from server.payload import (
    PayloadParseError,
    parse_target_lines,
    render_numbered_source,
    render_payload,
    render_translate_payload,
)

LANGUAGE_NAMES = {
    "en": "English",
    "en-gb": "British English",
    "fr": "French",
    "es": "Spanish",
    "es-es": "European Spanish",
    "es-419": "Latin American Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "pt-pt": "European Portuguese",
    "pt-br": "Brazilian Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "uk": "Ukrainian",
    "sv": "Swedish",
    "ru": "Russian",
    "ja": "Japanese",
    "zh": "Chinese",
    "ko": "Korean",
    "ar": "Arabic",
    "he": "Hebrew",
}


def _lang_name(code: str) -> str:
    """Resolve a language code to a display name.

    Tries the full code first (e.g. "pt-BR" -> "Brazilian Portuguese"), then
    falls back to the base subtag (e.g. "pt-XX" -> "Portuguese"), then
    uppercases the original code as a last resort.
    """
    key = code.lower()
    if key in LANGUAGE_NAMES:
        return LANGUAGE_NAMES[key]
    base = key.split("-", 1)[0]
    if base in LANGUAGE_NAMES:
        return LANGUAGE_NAMES[base]
    return code.upper()


def render_editor_prompt(*, template: str, target_code: str) -> str:
    return template.replace("{TARGET_LANG_CODE}", target_code.upper()).replace(
        "{TARGET_LANG_NAME}", _lang_name(target_code)
    )


def render_reviewer_prompt(*, template: str, target_code: str) -> str:
    return template.replace("{TARGET_LANG_CODE}", target_code.upper()).replace(
        "{TARGET_LANG_NAME}", _lang_name(target_code)
    )


def _chapter_dir(slug: str, n: int) -> Path:
    d = book_dir(slug) / "chapters" / f"ch{n:02d}"
    d.mkdir(parents=True, exist_ok=True)
    return d


async def run_editor_pass(
    *,
    client: OpenRouterClient,
    slug: str,
    chapter_n: int,
    round_n: int,
    en_doc: ParsedDoc,
    target_doc: ParsedDoc,
    source_code: str,
    target_code: str,
    editor_prompt_template: str,
    prior_reviewer_suggestions: Optional[list],
    model: str,
    on_retry=None,
) -> ParsedDoc:
    """Run the Editor pass and persist round-N-editor.{docx,json}."""
    payload = render_payload(en_doc, target_doc, source_code=source_code, target_code=target_code)
    user_msg = payload
    if prior_reviewer_suggestions:
        user_msg = (
            "Prior reviewer suggestions (incorporate the ones you agree with):\n"
            + json.dumps(prior_reviewer_suggestions, ensure_ascii=False, indent=2)
            + "\n\n"
            + payload
        )
    system = render_editor_prompt(template=editor_prompt_template, target_code=target_code)
    raw = await client.chat(model=model, system=system, user=user_msg, on_retry=on_retry)

    cdir = _chapter_dir(slug, chapter_n)
    # Save the raw response immediately so a parse failure leaves something on
    # disk to debug. Removed/overwritten on success below.
    (cdir / f"round-{round_n}-editor.raw.txt").write_text(raw)

    try:
        edited = parse_target_lines(
            raw,
            target_code=target_code,
            expected_count=len(en_doc.paragraphs),
        )
    except PayloadParseError as exc:
        raise RecoverableError(
            f"{exc} (raw response saved to round-{round_n}-editor.raw.txt)"
        ) from exc

    write_docx(edited, cdir / f"round-{round_n}-editor.docx")
    (cdir / f"round-{round_n}-editor.json").write_text(edited.model_dump_json(indent=2))
    return edited


import re
from typing import List

from pydantic import BaseModel, Field

from server.state import now_iso


class Suggestion(BaseModel):
    id: int
    quote: str
    comment: str


class ReviewerResult(BaseModel):
    round: int
    model: str
    completed_at: str
    suggestions: List[Suggestion] = Field(default_factory=list)
    raw_response: str


_JSON_LIST_RE = re.compile(r"\[\s*[\{\]].*\]", re.DOTALL)
_FENCE_RE = re.compile(r"^```(?:json)?\s*\n(.*?)\n```\s*$", re.DOTALL)
# Fallback per-suggestion extractor for malformed/truncated JSON. Captures any
# JSON object literal that has both `quote` and `comment` string fields.
_SUGGESTION_RE = re.compile(
    r'\{\s*"quote"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"comment"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}',
    re.DOTALL,
)


def _strip_fence(s: str) -> str:
    """Remove a surrounding ```json ... ``` markdown fence if present."""
    m = _FENCE_RE.match(s.strip())
    return m.group(1).strip() if m else s


def _try_parse_suggestions(raw: str) -> List[Suggestion]:
    candidate = _strip_fence(raw.strip())
    # First try strict JSON: extract the first JSON list (e.g. wrapped in prose).
    parsed: list | None = None
    if candidate.startswith("["):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            parsed = None
    else:
        m = _JSON_LIST_RE.search(candidate)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except json.JSONDecodeError:
                parsed = None

    out: List[Suggestion] = []
    if isinstance(parsed, list):
        for i, item in enumerate(parsed, start=1):
            if not isinstance(item, dict):
                continue
            q = item.get("quote")
            c = item.get("comment")
            if isinstance(q, str) and isinstance(c, str):
                out.append(Suggestion(id=i, quote=q, comment=c))

    # Fall back to per-object regex extraction. This recovers suggestions from
    # responses that are truncated mid-array, missing brackets, or otherwise
    # not valid top-level JSON.
    if not out:
        for i, m in enumerate(_SUGGESTION_RE.finditer(candidate), start=1):
            try:
                q = json.loads(f'"{m.group(1)}"')
                c = json.loads(f'"{m.group(2)}"')
            except json.JSONDecodeError:
                continue
            if isinstance(q, str) and isinstance(c, str):
                out.append(Suggestion(id=i, quote=q, comment=c))

    return out


async def run_reviewer_pass(
    *,
    client: OpenRouterClient,
    slug: str,
    chapter_n: int,
    round_n: int,
    en_doc: ParsedDoc,
    target_doc: ParsedDoc,
    source_code: str,
    target_code: str,
    reviewer_prompt_template: str,
    model: str,
    on_retry=None,
) -> ReviewerResult:
    payload = render_payload(en_doc, target_doc, source_code=source_code, target_code=target_code)
    system = render_reviewer_prompt(template=reviewer_prompt_template, target_code=target_code)
    raw = await client.chat(model=model, system=system, user=payload, on_retry=on_retry)

    suggestions = _try_parse_suggestions(raw)
    result = ReviewerResult(
        round=round_n,
        model=model,
        completed_at=now_iso(),
        suggestions=suggestions,
        raw_response=raw,
    )
    cdir = _chapter_dir(slug, chapter_n)
    (cdir / f"round-{round_n}-reviewer.json").write_text(result.model_dump_json(indent=2))
    return result


def render_translate_prompt(*, template: str, source_code: str, target_code: str) -> str:
    return (
        template.replace("{SOURCE_LANG_CODE}", source_code.upper())
        .replace("{SOURCE_LANG_NAME}", _lang_name(source_code))
        .replace("{TARGET_LANG_CODE}", target_code.upper())
        .replace("{TARGET_LANG_NAME}", _lang_name(target_code))
    )


def _restore_styles(parsed: ParsedDoc, reference: ParsedDoc) -> ParsedDoc:
    """Re-apply the reference doc's styles by index (counts already match)."""
    return ParsedDoc(paragraphs=[
        Paragraph(style=r.style, text=p.text)
        for p, r in zip(parsed.paragraphs, reference.paragraphs)
    ])


def _reject_empty_paragraphs(parsed: ParsedDoc, *, artifact: str) -> None:
    empties = [i for i, p in enumerate(parsed.paragraphs, start=1) if not p.text.strip()]
    if empties:
        raise RecoverableError(
            f"empty paragraphs returned at index {empties} "
            f"(raw response saved to {artifact})"
        )


async def run_simplification_pass(
    *,
    client: OpenRouterClient,
    slug: str,
    chapter_n: int,
    en_doc: ParsedDoc,
    source_code: str,
    simplifier_prompt_template: str,
    model: str,
    on_retry=None,
) -> ParsedDoc:
    """Simplify the English source; persist draft-simplified.json."""
    payload = render_numbered_source(en_doc, source_code=source_code)
    system = render_translate_prompt(
        template=simplifier_prompt_template, source_code=source_code, target_code=source_code
    )
    raw = await client.chat(model=model, system=system, user=payload, on_retry=on_retry)

    cdir = _chapter_dir(slug, chapter_n)
    (cdir / "draft-simplified.raw.txt").write_text(raw)
    try:
        simplified = parse_target_lines(
            raw,
            target_code=source_code,
            expected_count=len(en_doc.paragraphs),
        )
    except PayloadParseError as exc:
        raise RecoverableError(
            f"{exc} (raw response saved to draft-simplified.raw.txt)"
        ) from exc
    _reject_empty_paragraphs(simplified, artifact="draft-simplified.raw.txt")
    simplified = _restore_styles(simplified, en_doc)
    (cdir / "draft-simplified.json").write_text(simplified.model_dump_json(indent=2))
    return simplified


async def run_dossier_pass(
    *,
    client: OpenRouterClient,
    slug: str,
    chapter_n: int,
    simplified_doc: ParsedDoc,
    source_code: str,
    target_code: str,
    dossier_prompt_template: str,
    model: str,
    on_retry=None,
) -> str:
    """Analyze the simplified chapter; persist draft-dossier.md (free text)."""
    source = render_numbered_source(simplified_doc, source_code=source_code)
    system = render_translate_prompt(
        template=dossier_prompt_template, source_code=source_code, target_code=target_code
    )
    raw = await client.chat(model=model, system=system, user=source, on_retry=on_retry)

    cdir = _chapter_dir(slug, chapter_n)
    (cdir / "draft-dossier.md").write_text(raw)
    return raw


async def run_translation_pass(
    *,
    client: OpenRouterClient,
    slug: str,
    chapter_n: int,
    simplified_doc: ParsedDoc,
    dossier: str,
    source_code: str,
    target_code: str,
    translator_prompt_template: str,
    model: str,
    on_retry=None,
) -> ParsedDoc:
    """Translate the simplified chapter; persist the manufactured draft."""
    payload = render_translate_payload(
        simplified_doc, source_code=source_code, target_code=target_code
    )
    user_msg = (
        "Translation Dossier (follow it for culture, characters, terms, and dialogue):\n"
        + dossier
        + "\n\n"
        + payload
    )
    system = render_translate_prompt(
        template=translator_prompt_template, source_code=source_code, target_code=target_code
    )
    raw = await client.chat(model=model, system=system, user=user_msg, on_retry=on_retry)

    cdir = _chapter_dir(slug, chapter_n)
    (cdir / "draft-translation.raw.txt").write_text(raw)
    try:
        translated = parse_target_lines(
            raw,
            target_code=target_code,
            expected_count=len(simplified_doc.paragraphs),
        )
    except PayloadParseError as exc:
        raise RecoverableError(
            f"{exc} (raw response saved to draft-translation.raw.txt)"
        ) from exc
    _reject_empty_paragraphs(translated, artifact="draft-translation.raw.txt")
    translated = _restore_styles(translated, simplified_doc)
    stdir = book_dir(slug) / "source-translated"
    stdir.mkdir(parents=True, exist_ok=True)
    (stdir / f"ch{chapter_n:02d}.json").write_text(translated.model_dump_json(indent=2))
    write_docx(translated, stdir / f"ch{chapter_n:02d}.docx")
    return translated
