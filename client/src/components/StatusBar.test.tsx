import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import StatusBar, { type ActivityEntry } from "./StatusBar";

const empty: ActivityEntry[] = [];
const sample: ActivityEntry[] = [
  { id: 1, ts: Date.UTC(2026, 0, 1, 12, 0, 0), text: "Ch 1 R1 → Editor (m) · source: original translation", kind: "status" },
  { id: 2, ts: Date.UTC(2026, 0, 1, 12, 0, 5), text: "Ch 1 R1 ← Editor returned", kind: "status" },
  { id: 3, ts: Date.UTC(2026, 0, 1, 12, 0, 6), text: "✓ Ch 1 R1 editor complete", kind: "complete" },
];

describe("StatusBar", () => {
  it("shows 'Idle' when activity is empty", () => {
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize={false}
        onContinue={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("renders activity entries in the log", () => {
    render(
      <StatusBar
        activity={sample}
        busy={false}
        elapsed={0}
        canFinalize={false}
        onContinue={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(/Editor returned/)).toBeInTheDocument();
    expect(screen.getAllByText(/editor complete/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the most recent entry plus elapsed seconds when busy", () => {
    render(
      <StatusBar
        activity={sample}
        busy
        elapsed={12}
        canFinalize
        onContinue={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(/editor complete \(12s\)/)).toBeInTheDocument();
  });

  it("disables Continue while busy", () => {
    render(
      <StatusBar
        activity={empty}
        busy
        elapsed={0}
        canFinalize
        onContinue={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("disables Done when canFinalize is false", () => {
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize={false}
        onContinue={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();
  });

  it("calls onContinue when Continue is clicked", async () => {
    const onContinue = vi.fn();
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize
        onContinue={onContinue}
        onDone={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("asks for confirmation before calling onDone", async () => {
    const onDone = vi.fn();
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize
        onContinue={() => {}}
        onDone={onDone}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^done$/i }));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText(/write final\.docx and mark done/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("cancel dismisses the Done confirmation without finalizing", async () => {
    const onDone = vi.fn();
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize
        onContinue={() => {}}
        onDone={onDone}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^done$/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^done$/i })).toBeInTheDocument();
  });

  it("shows a download link when finalDownloadUrl is provided", () => {
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize={false}
        onContinue={() => {}}
        onDone={() => {}}
        finalDownloadUrl="/books/x/chapter/1/final"
      />,
    );
    expect(screen.getByRole("link", { name: /download final\.docx/i }))
      .toHaveAttribute("href", "/books/x/chapter/1/final");
  });

  it("shows no download link when finalDownloadUrl is absent", () => {
    render(
      <StatusBar
        activity={empty}
        busy={false}
        elapsed={0}
        canFinalize
        onContinue={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.queryByRole("link", { name: /download final\.docx/i })).not.toBeInTheDocument();
  });
});
