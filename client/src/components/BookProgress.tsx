import { Link } from "react-router-dom";
import type { ChapterEntry } from "../types/api";

interface Props {
  bookSlug: string;
  chapters: ChapterEntry[];
}

const needsTranslation = (c: ChapterEntry) => c.status === "untouched" && !c.has_draft;

export default function BookProgress({ bookSlug, chapters }: Props) {
  if (chapters.length === 0) return null;
  const untranslated = chapters.filter(needsTranslation);
  const done = chapters.filter((c) => c.status === "done");
  const inProgress = chapters.filter((c) => c.status !== "done" && !needsTranslation(c));
  const next = untranslated[0] ?? chapters.find((c) => c.status !== "done") ?? null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-700">
        {untranslated.length} to translate · {inProgress.length} in progress · {done.length} done
      </span>
      {next ? (
        <Link
          to={`/book/${bookSlug}/chapter/${next.n}`}
          className="shrink-0 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          {needsTranslation(next) ? `Translate chapter ${next.n}` : `Continue chapter ${next.n}`}
        </Link>
      ) : (
        <span className="text-sm font-medium text-green-700">
          ✓ All {chapters.length} chapter{chapters.length === 1 ? "" : "s"} done
        </span>
      )}
    </div>
  );
}
