import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/vue";
import ChatPanel from "../components/ChatPanel.vue";

const sampleLog = [
  { speaker: "user", text: "Hello there!", ts: 1700000000000 },
  { speaker: "model", text: "Hi! How are you?", ts: 1700000005000 },
  { speaker: "user", text: "I am fine, thanks.", ts: 1700000010000 },
];

describe("ChatPanel", () => {
  it("mounts without errors", () => {
    const { container } = render(ChatPanel, {
      props: { open: false, log: [] },
    });

    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies translate-y-0 when open is true", () => {
    const { container } = render(ChatPanel, {
      props: { open: true, log: [] },
    });

    const section = container.querySelector("section");
    expect(section.className).toContain("translate-y-0");
    expect(section.className).not.toContain("translate-y-full");
  });

  it("applies translate-y-full when open is false", () => {
    const { container } = render(ChatPanel, {
      props: { open: false, log: [] },
    });

    const section = container.querySelector("section");
    expect(section.className).toContain("translate-y-full");
  });

  it("renders conversation entries from log prop", () => {
    render(ChatPanel, {
      props: { open: true, log: sampleLog },
    });

    expect(screen.getByText("Hello there!")).toBeInTheDocument();
    expect(screen.getByText("Hi! How are you?")).toBeInTheDocument();
    expect(screen.getByText("I am fine, thanks.")).toBeInTheDocument();
  });

  it("renders speaker names for each entry", () => {
    render(ChatPanel, {
      props: { open: true, log: sampleLog },
    });

    const userLabels = screen.getAllByText("user");
    const modelLabels = screen.getAllByText("model");
    expect(userLabels.length).toBe(2);
    expect(modelLabels.length).toBe(1);
  });

  it("renders date dividers", () => {
    render(ChatPanel, {
      props: { open: true, log: sampleLog },
    });

    // All entries share the same date, so we should see exactly 1 divider
    // The divider text is formatted by Intl.DateTimeFormat, so we check
    // the divider container element exists
    const { container } = render(ChatPanel, {
      props: { open: true, log: sampleLog },
    });
    // Dividers have h-px spans as visual lines
    const dividerLines = container.querySelectorAll(".h-px");
    // Each divider has 2 lines (left and right). At least 1 divider expected.
    expect(dividerLines.length).toBeGreaterThanOrEqual(2);
  });

  it("renders date dividers for entries on different dates", () => {
    const multiDayLog = [
      { speaker: "user", text: "Day one", ts: 1700000000000 },
      {
        speaker: "model",
        text: "Day two",
        ts: 1700000000000 + 86400 * 1000,
      },
    ];

    const { container } = render(ChatPanel, {
      props: { open: true, log: multiDayLog },
    });

    // 2 different dates => 2 dividers => 4 h-px lines
    const dividerLines = container.querySelectorAll(".h-px");
    expect(dividerLines.length).toBe(4);
  });

  it("emits close event when Close button is clicked", async () => {
    const { emitted } = render(ChatPanel, {
      props: { open: true, log: [] },
    });

    await fireEvent.click(screen.getByText("Close"));

    expect(emitted()).toHaveProperty("close");
    expect(emitted().close).toHaveLength(1);
  });

  it("displays 'Conversation' heading", () => {
    render(ChatPanel, {
      props: { open: true, log: [] },
    });

    expect(screen.getByText("Conversation")).toBeInTheDocument();
  });

  it("renders entries in reverse chronological order", () => {
    const { container } = render(ChatPanel, {
      props: { open: true, log: sampleLog },
    });

    // The component reverses the log, so the last entry appears first
    const entryTexts = Array.from(
      container.querySelectorAll("[class*='border-l-']")
    ).map((el) => el.textContent);

    // "I am fine, thanks." should appear before "Hello there!" in the DOM
    const fineIndex = entryTexts.findIndex((t) =>
      t.includes("I am fine, thanks.")
    );
    const helloIndex = entryTexts.findIndex((t) =>
      t.includes("Hello there!")
    );
    expect(fineIndex).toBeLessThan(helloIndex);
  });

  it("applies blue border for user entries and primary border for model entries", () => {
    const { container } = render(ChatPanel, {
      props: { open: true, log: sampleLog },
    });

    const userEntries = container.querySelectorAll(".border-l-blue-500");
    const modelEntries = container.querySelectorAll(".border-l-primary");

    expect(userEntries.length).toBe(2);
    expect(modelEntries.length).toBe(1);
  });

  it("handles empty log gracefully", () => {
    const { container } = render(ChatPanel, {
      props: { open: true, log: [] },
    });

    // Should still render the section and header but no entries
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    const entries = container.querySelectorAll("[class*='border-l-']");
    expect(entries.length).toBe(0);
  });
});
