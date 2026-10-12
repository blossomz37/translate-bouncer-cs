"""Prompt versioning for the Editor, Reviewer, Simplifier, Dossier, and Translator prompts.

Each prompt file stores: {"current": "vN", "versions": [{"id":..., "saved_at":..., "text":...}]}.
- Restoring an old version creates a new entry with its text and promotes it to current.
- Deleting the current version is forbidden.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List

from pydantic import BaseModel, Field

from server.paths import prompts_dir


class PromptKind(str, Enum):
    EDITOR = "editor"
    REVIEWER = "reviewer"
    SIMPLIFIER = "simplifier"
    DOSSIER = "dossier"
    TRANSLATOR = "translator"


class PromptVersion(BaseModel):
    id: str
    saved_at: str
    text: str


class PromptFile(BaseModel):
    current: str
    versions: List[PromptVersion] = Field(default_factory=list)


SEED_EDITOR = (
    "You are proofreading a chapter of a novel that has been translated by AI into "
    "{TARGET_LANG_NAME}. You will receive the English original and the current "
    "translation, paragraph by paragraph and aligned by index.\n\n"
    "Proof the translation only. Do not edit the book itself — do not change plot, "
    "characters, voice, pacing, or authorial choices. Your job is linguistic, not "
    "editorial.\n\n"
    "Use the English source as a reference for the author's voice, style, and tone. "
    "Fix awkward phrasing, unnatural word order, translation artifacts, register "
    "mismatches, idioms that don't land, and anything that sounds machine-translated. "
    "Preserve the author's style and tone — if the original is informal, stay informal; "
    "if it's literary, stay literary.\n\n"
    "If a previous reviewer's suggestions are provided, incorporate the ones you agree "
    "with and ignore those you don't. Do not explain your decisions.\n\n"
    "Return only the revised translation, in the exact paragraph-aligned format you "
    "received, with one `{TARGET_LANG_CODE}:` line per paragraph and nothing else."
)

SEED_REVIEWER = (
    "You are reviewing a chapter of a novel that has been translated by AI into "
    "{TARGET_LANG_NAME} and then proofread. You will receive the English original and "
    "the current translation, paragraph by paragraph and aligned by index.\n\n"
    "Identify what should change to make the translation read like it was written by "
    "a native speaker of the target language while remaining faithful to the author's "
    "voice, style, and tone in the English source. Do not suggest editorial changes — "
    "your suggestions must be linguistic, not creative.\n\n"
    "The user does not speak the target language. Communicate to them in English.\n\n"
    "Return a JSON list of suggestions. Each entry must have `quote` (the translation "
    "snippet to change) and `comment` (what should change and why). Return only the "
    "JSON list, no preamble or commentary."
)


SEED_SIMPLIFIER = (
    "You are preparing a chapter of a novel for translation. You will receive "
    "the chapter as numbered paragraphs in {SOURCE_LANG_NAME}. Simplify the "
    "language to make it easier to translate, while preserving dialogue, "
    "formatting, and core meaning:\n\n"
    "1. Simplify sentence structures by breaking down complex sentences into "
    "simpler ones.\n"
    "2. Replace difficult vocabulary with common synonyms without changing "
    "meaning.\n"
    "3. Retain all dialogue as it is, ensuring character voices remain "
    "authentic.\n"
    "4. Preserve all formatting markers — keep every *italic* and **bold** "
    "marker in place.\n"
    "5. Maintain essential descriptive elements that contribute to mood and "
    "atmosphere.\n"
    "6. Focus on retaining the core meaning and narrative flow of each scene.\n\n"
    "Keep the exact same paragraphs in the exact same order: simplify within "
    "each paragraph, never merge or split paragraphs, never add, remove, or "
    "leave any paragraph empty.\n\n"
    "Return only the simplified chapter, in the exact paragraph-aligned "
    "format you received, with one `{SOURCE_LANG_CODE}:` line per paragraph "
    "and nothing else."
)

SEED_DOSSIER = (
    "Read the following chapter carefully and create a Translation Dossier "
    "for translating it into {TARGET_LANG_NAME}. The chapter arrives as "
    "numbered paragraphs; the `[N]` markers are scaffolding — do not mention "
    "them, just analyze the chapter. The dossier must have these sections:\n\n"
    "Cultural and Linguistic Changes: cultural references, idioms, similes, "
    "or metaphors needing adaptation or alternative expressions.\n\n"
    "Character Details: each character mentioned, with gender and any traits "
    "or titles affecting translation.\n\n"
    "Names and Titles: character names, place names, and titles needing "
    "localization or adaptation for cultural resonance.\n\n"
    "Plot-Specific Terms: key plot elements, recurring themes, or unique "
    "jargon to translate consistently — a mini-glossary with the exact "
    "target-language term for each.\n\n"
    "Dialogue Nuances: speech patterns, dialects, slang, or colloquial "
    "language needing special attention. Note formal vs. informal address "
    "between characters.\n\n"
    "Setting Descriptions: setting details unfamiliar to the target audience "
    "that may need context or adaptation.\n\n"
    "Emotional Tone and Style: the overall emotional tone and narrative "
    "style to preserve.\n\n"
    "Pacing and Structure: sections where pacing is critical (action, "
    "climaxes) needing careful handling.\n\n"
    "Legal or Technical Terms: legal, medical, or technical terminology "
    "needing precise translation.\n\n"
    "Contextual Background: historical, political, or social context needed "
    "to understand the chapter.\n\n"
    "Keep each section detailed and actionable. Return only the dossier."
)

SEED_TRANSLATOR = (
    "Using the provided Translation Dossier and chapter text, translate the "
    "chapter into {TARGET_LANG_NAME}. The chapter arrives as numbered "
    "paragraphs. Ensure the translation is accurate, culturally relevant, "
    "and maintains the original style and tone:\n\n"
    "Cultural Adaptation: use the dossier to adapt cultural references, "
    "idioms, similes, and metaphors. Expressions with direct translations "
    "may still need context-specific adaptation for naturalness.\n\n"
    "Character Consistency: keep dossier character details, including "
    "gender-specific language, traits, and titles. Dialogue should sound "
    "like natural {TARGET_LANG_NAME} speech while keeping each voice "
    "authentic.\n\n"
    "Terminology and Names: translate names, places, and titles per the "
    "dossier; keep plot-specific terms exactly as the dossier glossary "
    "prescribes.\n\n"
    "Dialogue Integrity: preserve dialogue authenticity; adapt colloquial "
    "language for naturalness while keeping intent. Present dialogue the "
    "{TARGET_LANG_NAME} way (e.g. French uses tirets cadratins without "
    "quotes).\n\n"
    "Emotional Tone and Style: preserve the dossier's tone and style; aim "
    "for fluidity so emotional nuances land.\n\n"
    "Formatting: keep all formatting intact — paragraph breaks and every "
    "*italic* and **bold** marker.\n\n"
    "Contextual Awareness: prefer context over literal translation where "
    "source structure and target norms disagree.\n\n"
    "Keep the exact same paragraphs in the exact same order: never merge, "
    "split, add, remove, or leave any paragraph empty.\n\n"
    "Return only the translated chapter, in the exact paragraph-aligned "
    "format you received, with one `{TARGET_LANG_CODE}:` line per paragraph "
    "and nothing else."
)


def _path(kind: PromptKind):
    return prompts_dir() / f"{kind.value}.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


_SEEDS = {
    PromptKind.EDITOR: SEED_EDITOR,
    PromptKind.REVIEWER: SEED_REVIEWER,
    PromptKind.SIMPLIFIER: SEED_SIMPLIFIER,
    PromptKind.DOSSIER: SEED_DOSSIER,
    PromptKind.TRANSLATOR: SEED_TRANSLATOR,
}


def _seed(kind: PromptKind) -> PromptFile:
    return PromptFile(
        current="v1",
        versions=[PromptVersion(id="v1", saved_at=_now(), text=_SEEDS[kind])],
    )


def load_prompts(kind: PromptKind) -> PromptFile:
    p = _path(kind)
    if not p.exists():
        seeded = _seed(kind)
        prompts_dir().mkdir(parents=True, exist_ok=True)
        p.write_text(seeded.model_dump_json(indent=2))
        return seeded
    return PromptFile.model_validate_json(p.read_text())


def list_versions(kind: PromptKind) -> List[PromptVersion]:
    return load_prompts(kind).versions


def _next_id(existing: List[PromptVersion]) -> str:
    nums = [int(v.id[1:]) for v in existing if v.id.startswith("v") and v.id[1:].isdigit()]
    return f"v{(max(nums) if nums else 0) + 1}"


def save_new_version(kind: PromptKind, text: str) -> str:
    data = load_prompts(kind)
    new_id = _next_id(data.versions)
    data.versions.append(PromptVersion(id=new_id, saved_at=_now(), text=text))
    data.current = new_id
    _path(kind).write_text(data.model_dump_json(indent=2))
    return new_id


def restore_version(kind: PromptKind, version_id: str) -> str:
    data = load_prompts(kind)
    target = next((v for v in data.versions if v.id == version_id), None)
    if target is None:
        raise ValueError(f"unknown version {version_id}")
    return save_new_version(kind, target.text)


def delete_version(kind: PromptKind, version_id: str) -> None:
    data = load_prompts(kind)
    if data.current == version_id:
        raise ValueError(f"cannot delete current version {version_id}")
    data.versions = [v for v in data.versions if v.id != version_id]
    _path(kind).write_text(data.model_dump_json(indent=2))
