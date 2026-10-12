import type { Model, ParsedDoc } from "../types/api";

// Estimate-only cost math (v1). Tokens ≈ chars / 4; output is assumed to
// be about as long as the input. Real usage capture is future work, so
// every surface using this must label figures as estimates.

export function docChars(doc: ParsedDoc | null): number {
  if (!doc) return 0;
  return doc.paragraphs.reduce((n, p) => n + p.text.length + 1, 0);
}

export function estimateCost(
  inputChars: number,
  model: Model | undefined,
  calls: number,
): number | null {
  if (!model || calls <= 0 || inputChars <= 0) return null;
  const prompt = parseFloat(model.pricing?.prompt ?? "");
  const completion = parseFloat(model.pricing?.completion ?? "");
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) return null;
  if (prompt === 0 && completion === 0) return 0;
  return ((inputChars / 4) * (prompt + completion) * calls);
}

export function formatEstimate(cost: number | null): string | null {
  if (cost === null) return null;
  if (cost === 0) return "free";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}
