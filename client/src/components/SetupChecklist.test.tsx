import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SetupChecklist from "./SetupChecklist";

describe("SetupChecklist", () => {
  it("renders nothing when everything is done", () => {
    const { container } = render(
      <MemoryRouter>
        <SetupChecklist hasApiKey hasDefaultModels hasBooks onNewBook={() => {}} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows pending steps with actions", async () => {
    const onNewBook = vi.fn();
    render(
      <MemoryRouter>
        <SetupChecklist hasApiKey={false} hasDefaultModels={false} hasBooks={false} onNewBook={onNewBook} />
      </MemoryRouter>
    );
    expect(screen.getByText(/get set up/i)).toBeInTheDocument();
    expect(screen.getByText(/add your openrouter api key/i)).toBeInTheDocument();
    const settingsLinks = screen.getAllByRole("link", { name: /settings/i });
    expect(settingsLinks).toHaveLength(2);
    expect(settingsLinks[0]).toHaveAttribute("href", "/settings");
    await userEvent.click(screen.getByRole("button", { name: /new book/i }));
    expect(onNewBook).toHaveBeenCalledOnce();
  });

  it("marks completed steps done", () => {
    render(
      <MemoryRouter>
        <SetupChecklist hasApiKey hasDefaultModels={false} hasBooks onNewBook={() => {}} />
      </MemoryRouter>
    );
    // Only the models step is still pending.
    expect(screen.getAllByRole("link", { name: /settings/i })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /new book/i })).not.toBeInTheDocument();
  });
});
