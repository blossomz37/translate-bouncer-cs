import { useEffect, useRef, useState } from "react";

export interface ActivityEntry {
  id: number;
  ts: number;
  text: string;
  kind: "status" | "complete" | "error";
}

interface StatusBarProps {
  activity: ActivityEntry[];
  busy: boolean;
  elapsed: number;
  canFinalize: boolean;
  canContinue?: boolean;
  continueEstimate?: string | null;
  spendEstimate?: string | null;
  onContinue: () => void;
  onDone: () => void;
  finalDownloadUrl?: string | null;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function StatusBar({
  activity,
  busy,
  elapsed,
  canFinalize,
  canContinue = true,
  continueEstimate = null,
  spendEstimate = null,
  onContinue,
  onDone,
  finalDownloadUrl = null,
}: StatusBarProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [confirmingDone, setConfirmingDone] = useState(false);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activity]);

  const last = activity[activity.length - 1];
  const lastText = last ? last.text : "Idle";

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <div
        ref={logRef}
        className="max-h-32 overflow-y-auto border-b border-gray-200 px-4 py-1 font-mono text-xs"
      >
        {activity.length === 0 ? (
          <div className="text-gray-400">No activity yet.</div>
        ) : (
          activity.map((e) => (
            <div
              key={e.id}
              className={
                e.kind === "error"
                  ? "text-red-600"
                  : e.kind === "complete"
                    ? "text-green-700"
                    : "text-gray-700"
              }
            >
              <span className="text-gray-400">{formatTime(e.ts)}</span>{" "}
              {e.text}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="truncate text-sm text-gray-700">
          {busy && elapsed > 0 ? `${lastText} (${elapsed}s)` : lastText}
        </span>
        {confirmingDone && !busy ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Write final.docx and mark done?</span>
            <button
              type="button"
              onClick={() => { setConfirmingDone(false); onDone(); }}
              className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDone(false)}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {spendEstimate && (
              <span
                className="text-xs text-gray-400"
                title="Rough running estimate for translate + continue actions (batch runs excluded)"
              >
                ≈ {spendEstimate} est.
              </span>
            )}
            <button
              type="button"
              onClick={onContinue}
              disabled={busy || !canContinue}
              title={!canContinue ? "Translate the chapter first" : undefined}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {`Continue${continueEstimate ? ` (≈ ${continueEstimate})` : ""}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDone(true)}
              disabled={!canFinalize || busy}
              className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Done
            </button>
            {finalDownloadUrl && (
              <a
                href={finalDownloadUrl}
                download
                className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Download final.docx
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
