import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  hasApiKey: boolean;
  hasDefaultModels: boolean;
  hasBooks: boolean;
  onNewBook: () => void;
}

export default function SetupChecklist({ hasApiKey, hasDefaultModels, hasBooks, onNewBook }: Props) {
  if (hasApiKey && hasDefaultModels && hasBooks) return null;
  const row = (done: boolean, n: number, label: string, action: ReactNode) => (
    <li key={n} className="flex items-center justify-between gap-3 px-3 py-1.5">
      <span className="flex items-center gap-2 text-sm">
        {done ? (
          <span className="font-bold text-green-600">✓</span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-500">
            {n}
          </span>
        )}
        <span className={done ? "text-gray-400 line-through" : "text-gray-700"}>{label}</span>
      </span>
      {!done && action}
    </li>
  );
  const linkCls = "shrink-0 text-sm text-blue-600 hover:underline";
  return (
    <div className="mb-6 rounded border border-blue-200 bg-blue-50">
      <h2 className="px-3 pt-2 text-sm font-semibold text-gray-800">Get set up</h2>
      <ul className="divide-y divide-blue-100 py-1">
        {row(hasApiKey, 1, "Add your OpenRouter API key", <Link to="/settings" className={linkCls}>Settings</Link>)}
        {row(hasDefaultModels, 2, "Pick default Editor + Reviewer models", <Link to="/settings" className={linkCls}>Settings</Link>)}
        {row(hasBooks, 3, "Ingest your first book", <button type="button" onClick={onNewBook} className={linkCls}>New book</button>)}
      </ul>
    </div>
  );
}
