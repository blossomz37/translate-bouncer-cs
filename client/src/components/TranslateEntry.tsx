interface Props {
  disabled: boolean;
  busy: boolean;
  estimate: string | null;
  onTranslate: () => void;
}

export default function TranslateEntry({ disabled, busy, estimate, onTranslate }: Props) {
  return (
    <section className="overflow-y-auto border-r border-gray-200 bg-white px-4 py-2">
      <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">
        Working translation (no draft yet)
      </h2>
      <p className="max-w-md text-sm text-gray-700">
        This chapter has no translation yet. Generate a first draft from the
        English — simplify, then a translation dossier, then the draft itself —
        and refine it with rounds afterwards.
      </p>
      <button
        type="button"
        onClick={onTranslate}
        disabled={disabled || busy}
        title={disabled ? "Pick an editor model above first" : undefined}
        className="mt-3 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {busy ? "Translating…" : `Translate from English${estimate ? ` (≈ ${estimate})` : ""}`}
      </button>
      {busy && (
        <p className="mt-2 text-xs text-gray-500">Translating… watch the activity log below.</p>
      )}
    </section>
  );
}
