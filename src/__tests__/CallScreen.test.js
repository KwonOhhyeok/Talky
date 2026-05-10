import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/vue";
import CallScreen from "../components/CallScreen.vue";

const generateLessonMock = vi.hoisted(() => vi.fn());

vi.mock("../services/geminiLive", () => {
  class GeminiLiveSession {
    setSystemInstruction = vi.fn();
    startMic = vi.fn().mockResolvedValue(undefined);
    connect = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
  }
  return { GeminiLiveSession };
});

vi.mock("../services/sessionArchive", () => {
  class SessionArchive {
    createSession = vi.fn().mockResolvedValue(undefined);
    ingestTranscript = vi.fn();
    ingestModelAudio = vi.fn();
    finalize = vi.fn().mockResolvedValue(undefined);
    playLastModelAudio = vi.fn().mockResolvedValue(false);
  }
  return { SessionArchive };
});

vi.mock("../services/lessonGenerator", () => ({
  generateLesson: generateLessonMock,
}));

vi.mock("../config/systemPrompt", () => ({
  DEFAULT_LESSON_MATERIAL: "Fallback lesson material",
  DEFAULT_SYSTEM_INSTRUCTION: "Test system instruction",
  buildSystemInstruction: (lessonMaterial) =>
    `Test system instruction\n${lessonMaterial}`,
}));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ token: "test-token" }),
  text: async () => "",
});

const INTEREST_POPUP_TITLE = "어떤 주제로 대화할까요?";
const CHIP_TOPIC = "가상 아이돌 팬덤, 진짜 사랑일까?";

describe("CallScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    generateLessonMock.mockResolvedValue(
      "Generated lesson material for testing."
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders idle screen with InterestPopup", () => {
    render(CallScreen);

    expect(screen.getByRole("heading", { name: "Talky" })).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText(INTEREST_POPUP_TITLE)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("메시지를 입력하세요...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start call")).not.toBeInTheDocument();
  });

  it("passes selected topic from InterestPopup to generateLesson", async () => {
    render(CallScreen);

    await fireEvent.click(screen.getByRole("option", { name: CHIP_TOPIC }));
    await fireEvent.click(screen.getByRole("button", { name: "시작하기" }));

    await waitFor(() => {
      expect(generateLessonMock).toHaveBeenCalledWith(
        CHIP_TOPIC,
        expect.objectContaining({ apiBase: expect.any(String) })
      );
    });

    expect(localStorage.getItem("talky:last_interest")).toBe(CHIP_TOPIC);

    await waitFor(() => {
      expect(screen.queryByText(INTEREST_POPUP_TITLE)).not.toBeInTheDocument();
    });
  });
});
