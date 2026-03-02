import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/vue";
import InterestPopup from "../components/InterestPopup.vue";

const PLACEHOLDER =
  "주제를 직접 입력하세요 (예: 영화 추천, 요리 레시피)";
const CHIP_TOPIC = "AI가 번역가 일자리를 대체할까?";

function renderPopup(props = {}) {
  const onStart = vi.fn();
  render(InterestPopup, {
    props: {
      ...props,
      onStart,
    },
  });
  return { onStart };
}

describe("InterestPopup", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts with empty input and disabled start button", () => {
    renderPopup();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    const startButton = screen.getByRole("button", { name: "시작하기" });

    expect(input).toHaveValue("");
    expect(startButton).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "입력값 지우기" })
    ).not.toBeInTheDocument();
  });

  it("emits selected chip topic and clears input when chip is selected", async () => {
    const { onStart } = renderPopup();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    const chipButton = screen.getByRole("button", { name: CHIP_TOPIC });

    await fireEvent.update(input, "임시 입력");
    await fireEvent.click(chipButton);

    expect(input).toHaveValue("");
    expect(chipButton).toHaveAttribute("aria-selected", "true");

    await fireEvent.click(screen.getByRole("button", { name: "시작하기" }));
    expect(onStart).toHaveBeenCalledWith(CHIP_TOPIC);
    expect(localStorage.getItem("talky:last_interest")).toBe(CHIP_TOPIC);
  });

  it("clears chip focus when input gains focus and disables start when input is empty", async () => {
    renderPopup();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    const chipButton = screen.getByRole("button", { name: CHIP_TOPIC });
    const startButton = screen.getByRole("button", { name: "시작하기" });

    await fireEvent.click(chipButton);
    expect(chipButton).toHaveAttribute("aria-selected", "true");

    await fireEvent.focus(input);
    expect(chipButton).toHaveAttribute("aria-selected", "false");
    expect(startButton).toBeDisabled();
  });

  it("emits custom input topic on Enter key", async () => {
    const { onStart } = renderPopup();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    const topic = "영어 면접 준비";

    await fireEvent.focus(input);
    await fireEvent.update(input, topic);
    await fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onStart).toHaveBeenCalledWith(topic);
    expect(localStorage.getItem("talky:last_interest")).toBe(topic);
  });

  it("clears input via X button and keeps input focused", async () => {
    renderPopup();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    const startButton = screen.getByRole("button", { name: "시작하기" });

    await fireEvent.update(input, "토픽");
    const clearButton = screen.getByRole("button", { name: "입력값 지우기" });
    await fireEvent.click(clearButton);

    expect(input).toHaveValue("");
    expect(document.activeElement).toBe(input);
    expect(startButton).toBeDisabled();
  });

  it("keeps start button disabled while loading", async () => {
    const { onStart } = renderPopup({ isLoading: true });
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    await fireEvent.update(input, "주제 있음");

    const loadingText = screen.getByText("주제 분석 중...");
    const startButton = loadingText.closest("button");

    expect(startButton).not.toBeNull();
    expect(startButton).toBeDisabled();
    await fireEvent.click(startButton);
    expect(onStart).not.toHaveBeenCalled();
  });
});
