import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TranslateEntry from "./TranslateEntry";

describe("TranslateEntry", () => {
  it("shows the estimate and calls onTranslate", async () => {
    const onTranslate = vi.fn();
    render(
      <TranslateEntry disabled={false} busy={false} estimate="$0.43" onTranslate={onTranslate} />
    );
    const btn = screen.getByRole("button", { name: /translate from english \(≈ \$0\.43\)/i });
    await userEvent.click(btn);
    expect(onTranslate).toHaveBeenCalledOnce();
  });

  it("disables the button without a model and shows busy state", () => {
    const { rerender } = render(
      <TranslateEntry disabled busy={false} estimate={null} onTranslate={() => {}} />
    );
    expect(screen.getByRole("button", { name: /translate from english/i })).toBeDisabled();
    rerender(
      <TranslateEntry disabled={false} busy estimate={null} onTranslate={() => {}} />
    );
    expect(screen.getByRole("button", { name: /translating/i })).toBeDisabled();
  });
});
