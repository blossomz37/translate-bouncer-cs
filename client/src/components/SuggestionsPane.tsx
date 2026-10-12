import { useEffect, useState } from "react";
import { getChapterDialog, getChapterDraft } from "../api/chapters";
import type { ChapterDialog, ChapterDraft, ReviewerResult } from "../types/api";
import ParagraphRender from "./ParagraphRender";

interface Props {
  result: ReviewerResult | null;
  bookSlug: string;
  chapterN: number;
  currentRound: number;
}

type Tab = "suggestions" | "dialog" | "draft";

export default function SuggestionsPane({ result, bookSlug, chapterN, currentRound }: Props) {
  const [tab, setTab] = useState<Tab>("suggestions");
  const [dialog, setDialog] = useState<ChapterDialog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChapterDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "dialog") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getChapterDialog(bookSlug, chapterN)
      .then((d) => {
        if (!cancelled) setDialog(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, bookSlug, chapterN, currentRound]);

  useEffect(() => {
    if (tab !== "draft") return;
    let cancelled = false;
    setDraftLoading(true);
    setDraftError(null);
    getChapterDraft(bookSlug, chapterN)
      .then((d) => {
        if (!cancelled) setDraft(d);
      })
      .catch((e) => {
        if (!cancelled) setDraftError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, bookSlug, chapterN]);

  return (
    <section className="flex flex-col overflow-hidden bg-gray-50">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-1">
        <h2 className="text-xs font-semibold uppercase text-gray-500">
          {tab === "suggestions"
            ? `Reviewer suggestions${result ? ` (round ${result.round})` : ""}`
            : tab === "dialog"
              ? "Model dialog"
              : "Translation draft"}
        </h2>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("suggestions")}
            className={`rounded px-2 py-0.5 ${
              tab === "suggestions"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Suggestions
          </button>
          <button
            type="button"
            onClick={() => setTab("dialog")}
            className={`rounded px-2 py-0.5 ${
              tab === "dialog"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
            title="Show editor↔reviewer raw exchanges"
          >
            Dialog
          </button>
          <button
            type="button"
            onClick={() => setTab("draft")}
            className={`rounded px-2 py-0.5 ${
              tab === "draft"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
            title="Show the translation dossier and simplified text"
          >
            Draft
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {tab === "suggestions" && (
          <SuggestionsView result={result} />
        )}
        {tab === "dialog" && (
          <DialogView dialog={dialog} loading={loading} error={error} />
        )}
        {tab === "draft" && (
          <DraftView draft={draft} loading={draftLoading} error={draftError} />
        )}
      </div>
    </section>
  );
}

function DraftView({
  draft,
  loading,
  error,
}: {
  draft: ChapterDraft | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!draft || (!draft.dossier && !draft.simplified)) {
    return (
      <p className="text-sm text-gray-500">
        {draft && draft.has_draft
          ? "This chapter was translated outside Translate — no dossier or simplified text on file."
          : "No draft yet — translate this chapter first."}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {draft.dossier && (
        <details className="rounded border border-gray-200 bg-white" open>
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-blue-700">
            Translation dossier
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words bg-gray-50 px-2 py-1 font-mono text-xs">
            {draft.dossier}
          </pre>
        </details>
      )}
      {draft.simplified && (
        <details className="rounded border border-gray-200 bg-white">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-green-700">
            Simplified English ({draft.simplified.paragraphs.length} paragraphs)
          </summary>
          <div className="px-2 py-1">
            {draft.simplified.paragraphs.map((p, i) => (
              <ParagraphRender key={i} paragraph={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SuggestionsView({ result }: { result: ReviewerResult | null }) {
  if (!result) {
    return <p className="text-sm text-gray-500">Click Continue to run round 1.</p>;
  }
  if (result.suggestions.length === 0) {
    return <p className="text-sm text-gray-500">No suggestions returned.</p>;
  }
  return (
    <ol className="space-y-3">
      {result.suggestions.map((s) => (
        <li key={s.id} className="rounded border border-gray-200 bg-white p-2 text-sm">
          <div className="mb-1 italic text-gray-600">"{s.quote}"</div>
          <div>{s.comment}</div>
        </li>
      ))}
    </ol>
  );
}

function DialogView({
  dialog,
  loading,
  error,
}: {
  dialog: ChapterDialog | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!dialog || dialog.rounds.length === 0) {
    return <p className="text-sm text-gray-500">No rounds yet.</p>;
  }
  return (
    <div className="space-y-4">
      {dialog.rounds.map((r) => (
        <div key={r.n} className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
            Round {r.n}
          </div>
          <details className="border-b border-gray-100" open>
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-blue-700">
              Editor → {r.editor_model || "?"}{" "}
              <span className="text-gray-500">({r.editor_raw?.length ?? 0} chars)</span>
            </summary>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words bg-gray-50 px-2 py-1 font-mono text-xs">
              {r.editor_raw ?? "(no raw response saved)"}
            </pre>
          </details>
          <details className="border-b border-gray-100">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-purple-700">
              Reviewer → {r.reviewer_model || "?"}{" "}
              <span className="text-gray-500">({r.reviewer_raw?.length ?? 0} chars)</span>
            </summary>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words bg-gray-50 px-2 py-1 font-mono text-xs">
              {r.reviewer_raw ?? "(no reviewer pass yet)"}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-green-700">
              Suggestions extracted ({r.suggestions?.length ?? 0})
            </summary>
            {r.suggestions && r.suggestions.length > 0 ? (
              <ol className="space-y-2 px-2 py-2 text-xs">
                {r.suggestions.map((s) => (
                  <li key={s.id} className="rounded border border-gray-200 bg-gray-50 p-1">
                    <div className="italic text-gray-600">"{s.quote}"</div>
                    <div>{s.comment}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-2 py-1 text-xs text-gray-500">none</p>
            )}
          </details>
        </div>
      ))}
    </div>
  );
}
