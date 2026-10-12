import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StageIndicator from "./StageIndicator";

describe("StageIndicator", () => {
  it("highlights translate with its next step", () => {
    render(<StageIndicator stage="translate" />);
    expect(screen.getByText("Translate")).toBeInTheDocument();
    expect(screen.getByText(/next: translate this chapter/i)).toBeInTheDocument();
  });

  it("marks translate done once in rounds", () => {
    render(<StageIndicator stage="rounds" />);
    expect(screen.getByText("Rounds")).toHaveClass("font-semibold");
    expect(screen.getByText(/next: continue/i)).toBeInTheDocument();
  });

  it("shows everything done at done", () => {
    render(<StageIndicator stage="done" />);
    expect(screen.getByText(/finished — grab final\.docx below/i)).toBeInTheDocument();
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });
});
