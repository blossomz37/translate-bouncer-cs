import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { finalChapterUrl, finalizeChapter, runEditorRound, runReviewerRound, translateChapter } from "../api/chapters";
import type { ChapterMeta } from "../types/api";
import { ApiError } from "../api/client";
import BatchControls from "../components/BatchControls";
import EnglishPane from "../components/EnglishPane";
import StageIndicator from "../components/StageIndicator";
import StatusBar, { type ActivityEntry } from "../components/StatusBar";
import SuggestionsPane from "../components/SuggestionsPane";
import TopBar from "../components/TopBar";
import TranslateEntry from "../components/TranslateEntry";
import { docChars, estimateCost, formatEstimate } from "../lib/costEstimate";
import WorkingPane from "../components/WorkingPane";
import { useBook } from "../hooks/useBook";
import { useChapter } from "../hooks/useChapter";
import { useEvents } from "../hooks/useEvents";
import { useModels } from "../hooks/useModels";
import { useSettings } from "../hooks/useSettings";

export default function ChapterRoute() {
  const { slug = "", n: nStr = "1" } = useParams<{ slug: string; n: string }>();
  const n = parseInt(nStr, 10);
  const navigate = useNavigate();

  const bookState = useBook(slug);
  const book = bookState.meta;
  const chapter = useChapter(slug, n);
  const { models } = useModels();
  const { settings } = useSettings();

  const [editorModel, setEditorModel] = useState("");
  const [reviewerModel, setReviewerModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [busySince, setBusySince] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [estSpend, setEstSpend] = useState(0);

  const appendActivity = useCallback((text: string, kind: ActivityEntry["kind"]) => {
    setActivity((prev) => {
      const next: ActivityEntry = {
        id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
        ts: Date.now(),
        text,
        kind,
      };
      const out = [...prev, next];
      return out.length > 200 ? out.slice(out.length - 200) : out;
    });
  }, []);

  // Tick the elapsed-time counter while a round is running so the user can
  // see something is alive even when the model is slow to respond.
  useEffect(() => {
    if (!busy || busySince === null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - busySince) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [busy, busySince]);

  // Initialize models from chapter meta or defaults (once meta + settings load)
  useEffect(() => {
    if (chapter.meta && !editorModel) {
      setEditorModel(chapter.meta.models.editor || settings?.default_models.editor || "");
    }
    if (chapter.meta && !reviewerModel) {
      setReviewerModel(chapter.meta.models.reviewer || settings?.default_models.reviewer || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.meta, settings]);

  useEvents(
    useCallback((e) => {
      if (e.type === "status") appendActivity(e.text, "status");
      else if (e.type === "round_complete")
        appendActivity(
          `✓ Ch ${e.chapter ?? "?"} R${e.round} ${e.stage} complete`,
          "complete",
        );
      else if (e.type === "error") appendActivity(`⚠ ${e.text}`, "error");
    }, [appendActivity])
  );

  // Pull the most useful human-readable message out of an unknown error.
  // Our server's typed error responses look like { detail: { message, kind } };
  // ApiError stores .detail. Plain strings come through as detail too.
  function errorMessage(err: unknown): string {
    if (err instanceof ApiError) {
      const d = err.detail as unknown;
      if (typeof d === "string") return `HTTP ${err.status}: ${d}`;
      if (d && typeof d === "object" && "message" in (d as Record<string, unknown>)) {
        return `HTTP ${err.status}: ${(d as { message: string }).message}`;
      }
      return `HTTP ${err.status}`;
    }
    return err instanceof Error ? err.message : String(err);
  }

  // A "round" is Editor → Reviewer → Editor (apply suggestions). The leading
  // editor is skipped when the chapter already has an editor pass that hasn't
  // been reviewed yet, so back-to-back Continues don't redo work.
  function needsLeadingEditor(meta: ChapterMeta): boolean {
    if (meta.current_round === 0) return true;
    const last = meta.rounds.find((r) => r.n === meta.current_round);
    return !last || last.reviewer_completed_at != null;
  }

  // Estimate-only cost math (see lib/costEstimate): tokens ≈ chars/4,
  // output assumed ≈ input. Every figure is labeled as an estimate.
  const editorObj = models.find((m) => m.id === editorModel);
  const reviewerObj = models.find((m) => m.id === reviewerModel);
  const translateEstRaw = chapter.meta
    ? estimateCost(docChars(chapter.enDoc), editorObj, 3)
    : null;
  const translateEst = formatEstimate(translateEstRaw);
  const continueEstRaw = (() => {
    if (!chapter.meta) return null;
    const chars = docChars(chapter.enDoc) + docChars(chapter.workingDoc);
    const editorCalls = needsLeadingEditor(chapter.meta) ? 2 : 1;
    const parts = [
      estimateCost(chars, editorObj, editorCalls),
      estimateCost(chars, reviewerObj, 1),
    ].filter((v): v is number => v !== null);
    return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  })();
  const continueEst = formatEstimate(continueEstRaw);
  const needsTranslation = !!chapter.meta
    && chapter.meta.current_round === 0
    && !chapter.workingDoc;

  const handleContinue = async () => {
    setBusy(true);
    setBusySince(Date.now());
    try {
      if (needsLeadingEditor(chapter.meta!)) {
        await runEditorRound(slug, n, editorModel);
      }
      await runReviewerRound(slug, n, reviewerModel);
      await runEditorRound(slug, n, editorModel);
      await chapter.refresh();
    } catch (err) {
      appendActivity(`⚠ ${errorMessage(err)}`, "error");
    } finally {
      if (continueEstRaw !== null) setEstSpend((s) => s + continueEstRaw);
      setBusy(false);
      setBusySince(null);
    }
  };

  const handleTranslate = async () => {
    setBusy(true);
    setBusySince(Date.now());
    try {
      await translateChapter(slug, n, editorModel);
      await chapter.refresh();
      appendActivity(`✓ Ch ${n} draft translated`, "complete");
    } catch (err) {
      appendActivity(`⚠ ${errorMessage(err)}`, "error");
    } finally {
      if (translateEstRaw !== null) setEstSpend((s) => s + translateEstRaw);
      setBusy(false);
      setBusySince(null);
    }
  };

  const handleDone = async () => {
    setBusy(true);
    setBusySince(Date.now());
    try {
      await finalizeChapter(slug, n);
      await chapter.refresh();
      appendActivity(`✓ Ch ${n} finalized`, "complete");
    } catch (err) {
      appendActivity(`⚠ ${errorMessage(err)}`, "error");
    } finally {
      setBusy(false);
      setBusySince(null);
    }
  };

  if (!book || !chapter.meta) {
    const loadError = bookState.error ?? chapter.error;
    if (loadError && !bookState.loading && !chapter.loading) {
      return (
        <div data-testid="chapter-route" className="mx-auto max-w-lg p-6">
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            Couldn't load this chapter: {loadError.message}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => { bookState.refresh(); chapter.refresh(); }}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            >
              Retry
            </button>
            <Link
              to={`/book/${slug}`}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              Back to book
            </Link>
          </div>
        </div>
      );
    }
    return <div data-testid="chapter-route" className="p-6 text-gray-500">Loading…</div>;
  }

  const stage = chapter.meta.status === "done"
    ? "done"
    : needsTranslation
      ? "translate"
      : "rounds";

  return (
    <div data-testid="chapter-route" className="grid h-full grid-rows-[auto_auto_1fr_auto_auto] bg-gray-100">
      <TopBar
        bookSlug={slug}
        chapters={book.chapters}
        currentN={n}
        editorModel={editorModel}
        reviewerModel={reviewerModel}
        models={models}
        onEditorModelChange={setEditorModel}
        onReviewerModelChange={setReviewerModel}
        onChapterChange={(newN) => navigate(`/book/${slug}/chapter/${newN}`)}
      />
      <StageIndicator stage={stage} />
      <main className="grid grid-cols-3 overflow-hidden">
        <EnglishPane doc={chapter.enDoc} />
        {needsTranslation ? (
          <TranslateEntry
            disabled={!editorModel}
            busy={busy}
            estimate={translateEst}
            onTranslate={handleTranslate}
          />
        ) : (
          <WorkingPane doc={chapter.workingDoc} prevDoc={chapter.prevDoc} roundN={chapter.meta.current_round} />
        )}
        <SuggestionsPane
          result={chapter.suggestions}
          bookSlug={slug}
          chapterN={n}
          currentRound={chapter.meta.current_round}
        />
      </main>
      <BatchControls
        chapters={book.chapters}
        currentN={n}
        bookSlug={slug}
        editorModel={editorModel}
        reviewerModel={reviewerModel}
        disabled={busy}
        onBatchStart={() => {
          setBusy(true);
          setBusySince(Date.now());
        }}
        onBatchEnd={() => {
          setBusy(false);
          setBusySince(null);
          chapter.refresh();
        }}
        onProgress={(ev) => {
          if (ev.type === "chapter_start") {
            appendActivity(
              `▶ Batch ch ${ev.chapterN} (${ev.chapterIndex}/${ev.totalChapters}): ${ev.chapterTitle ?? ""}`,
              "status",
            );
          } else if (ev.type === "chapter_done") {
            appendActivity(`✓ Batch ch ${ev.chapterN} done`, "complete");
          } else if (ev.type === "error") {
            appendActivity(`⚠ Batch ch ${ev.chapterN}: ${ev.error}`, "error");
          } else if (ev.type === "done") {
            appendActivity("✓ Batch complete", "complete");
          }
        }}
      />
      <StatusBar
        activity={activity}
        busy={busy}
        elapsed={elapsed}
        canFinalize={chapter.meta.current_round > 0 && chapter.meta.status !== "done"}
        canContinue={!needsTranslation}
        continueEstimate={continueEst}
        spendEstimate={estSpend > 0 ? formatEstimate(estSpend) : null}
        onContinue={handleContinue}
        onDone={handleDone}
        finalDownloadUrl={chapter.meta.status === "done" ? finalChapterUrl(slug, n) : null}
      />
    </div>
  );
}
