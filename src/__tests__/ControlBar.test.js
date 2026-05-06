import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/vue";
import ControlBar from "../components/ControlBar.vue";

describe("ControlBar", () => {
  it("renders three buttons", () => {
    render(ControlBar, { props: { callActive: false } });

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders chat, call, and settings buttons with correct aria labels", () => {
    render(ControlBar, { props: { callActive: false } });

    expect(screen.getByLabelText("Toggle chat")).toBeInTheDocument();
    expect(screen.getByLabelText("Start call")).toBeInTheDocument();
    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });

  it("shows 'mic' icon text when callActive is false", () => {
    render(ControlBar, { props: { callActive: false } });

    const callButton = screen.getByLabelText("Start call");
    expect(callButton.textContent.trim()).toBe("mic");
  });

  it("shows 'call_end' icon text when callActive is true", () => {
    render(ControlBar, { props: { callActive: true } });

    const callButton = screen.getByLabelText("End call");
    expect(callButton.textContent.trim()).toBe("call_end");
  });

  it("emits toggleChat when chat button is clicked", async () => {
    const { emitted } = render(ControlBar, { props: { callActive: false } });

    await fireEvent.click(screen.getByLabelText("Toggle chat"));

    expect(emitted()).toHaveProperty("toggleChat");
    expect(emitted().toggleChat).toHaveLength(1);
  });

  it("emits toggleCall when call button is clicked", async () => {
    const { emitted } = render(ControlBar, { props: { callActive: false } });

    await fireEvent.click(screen.getByLabelText("Start call"));

    expect(emitted()).toHaveProperty("toggleCall");
    expect(emitted().toggleCall).toHaveLength(1);
  });

  it("emits toggleMenu when settings button is clicked", async () => {
    const { emitted } = render(ControlBar, { props: { callActive: false } });

    await fireEvent.click(screen.getByLabelText("Settings"));

    expect(emitted()).toHaveProperty("toggleMenu");
    expect(emitted().toggleMenu).toHaveLength(1);
  });

  it("applies primary background when callActive is false", () => {
    render(ControlBar, { props: { callActive: false } });

    const callButton = screen.getByLabelText("Start call");
    expect(callButton.className).toContain("bg-primary");
  });

  it("applies error background when callActive is true", () => {
    render(ControlBar, { props: { callActive: true } });

    const callButton = screen.getByLabelText("End call");
    expect(callButton.className).toContain("bg-error");
  });
});
