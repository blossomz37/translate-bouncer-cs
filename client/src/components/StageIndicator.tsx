export type Stage = "translate" | "rounds" | "done";

interface Props {
  stage: Stage;
}

const ORDER: Stage[] = ["translate", "rounds", "done"];
const LABELS: Record<Stage, string> = {
  translate: "Translate",
  rounds: "Rounds",
  done: "Done",
};
const NEXT: Record<Stage, string> = {
  translate: "Next: translate this chapter",
  rounds: "Next: Continue, or Done when happy",
  done: "Finished — grab final.docx below",
};

export default function StageIndicator({ stage }: Props) {
  const current = ORDER.indexOf(stage);
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-1.5">
      <ol className="flex flex-1 items-center gap-2">
        {ORDER.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={s} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  state === "done"
                    ? "bg-green-600 font-bold text-white"
                    : state === "current"
                      ? "bg-blue-600 font-bold text-white"
                      : "border border-gray-300 text-gray-400"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs ${
                  state === "current"
                    ? "font-semibold text-gray-900"
                    : state === "done"
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {LABELS[s]}
              </span>
              {i < ORDER.length - 1 && (
                <span className={`h-px flex-1 ${i < current ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 text-xs text-gray-500">{NEXT[stage]}</span>
    </div>
  );
}
