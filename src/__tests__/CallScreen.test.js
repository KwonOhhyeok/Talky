import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/vue";
import { mount } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Mock heavy service dependencies that are NOT under test
// ---------------------------------------------------------------------------
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

vi.mock("../config/systemPrompt", () => ({
  DEFAULT_SYSTEM_INSTRUCTION: "Test system instruction",
}));

// Stub fetch globally
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ token: "test-token" }),
  text: async () => "",
});

import CallScreen from "../components/CallScreen.vue";

/**
 * Helper to mount CallScreen and set internal reactive state.
 *
 * Because CallScreen uses <script setup>, its bindings are not exposed
 * on the public instance. We access them via the internal setupState
 * proxy on the component instance. VTU's `vm.$` gives us access to
 * the component's internal instance where setupState lives.
 *
 * The setupState proxy auto-unwraps refs, so we assign the plain value
 * (not `.value`). The proxy setter will update the underlying ref.
 */
function mountAndSetState(stateOverrides = {}) {
  const wrapper = mount(CallScreen);
  const state = wrapper.vm.$.setupState;

  for (const [key, value] of Object.entries(stateOverrides)) {
    state[key] = value;
  }

  return wrapper;
}

describe("CallScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Basic rendering
  // -----------------------------------------------------------------------
  it("mounts without errors", () => {
    const { container } = render(CallScreen);
    expect(container.querySelector("header")).toBeInTheDocument();
  });

  it("renders the Talky Live heading", () => {
    render(CallScreen);
    expect(screen.getByText("Talky Live")).toBeInTheDocument();
  });

  it("renders the timer with initial value 00:00", () => {
    render(CallScreen);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("renders the ControlBar child component", () => {
    render(CallScreen);
    expect(screen.getByLabelText("Toggle chat")).toBeInTheDocument();
    expect(screen.getByLabelText("Start call")).toBeInTheDocument();
    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. Idle state (default)
  // -----------------------------------------------------------------------
  it("does NOT show waveform bars in idle state", () => {
    const { container } = render(CallScreen);
    const waveformBars = container.querySelectorAll(".waveform-bar");
    expect(waveformBars.length).toBe(0);
  });

  it("does NOT show connecting overlay in idle state", () => {
    render(CallScreen);
    expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
  });

  it("does NOT show lesson material card in idle state", () => {
    render(CallScreen);
    expect(screen.queryByText("Lesson Material")).not.toBeInTheDocument();
  });

  it("shows the status text as 'idle' in the header badge", () => {
    render(CallScreen);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("does NOT show LIVE badge in idle state", () => {
    render(CallScreen);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 3. Connecting state
  // -----------------------------------------------------------------------
  describe("when status is connecting", () => {
    it("shows connecting overlay", async () => {
      const wrapper = mountAndSetState({ status: "connecting" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Connecting...");
      expect(wrapper.text()).toContain("Please wait before speaking");
    });

    it("shows connecting overlay with role=status for accessibility", async () => {
      const wrapper = mountAndSetState({ status: "connecting" });
      await wrapper.vm.$nextTick();

      const statusEl = wrapper.find("[role='status']");
      expect(statusEl.exists()).toBe(true);
      expect(statusEl.attributes("aria-label")).toBe("Connecting");
    });

    it("does NOT show waveform bars", async () => {
      const wrapper = mountAndSetState({ status: "connecting" });
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".waveform-bar").length).toBe(0);
    });

    it("does NOT show LIVE badge, shows 'connecting' text instead", async () => {
      const wrapper = mountAndSetState({ status: "connecting" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).not.toContain("LIVE");
      expect(wrapper.text()).toContain("connecting");
    });

    it("does NOT show lesson material", async () => {
      const wrapper = mountAndSetState({ status: "connecting" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).not.toContain("Lesson Material");
    });
  });

  // -----------------------------------------------------------------------
  // 4. Live state
  // -----------------------------------------------------------------------
  describe("when status is live", () => {
    it("shows waveform bars (24 total)", async () => {
      const wrapper = mountAndSetState({ status: "live" });
      await wrapper.vm.$nextTick();

      const bars = wrapper.findAll(".waveform-bar");
      expect(bars.length).toBe(24);
    });

    it("shows LIVE badge with ping animation", async () => {
      const wrapper = mountAndSetState({ status: "live" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("LIVE");
      // Verify the ping animation element exists
      expect(wrapper.find(".animate-ping").exists()).toBe(true);
    });

    it("shows lesson material card with title", async () => {
      const wrapper = mountAndSetState({ status: "live" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Lesson Material");
    });

    it("shows lesson material paragraphs joined together", async () => {
      const wrapper = mountAndSetState({ status: "live" });
      await wrapper.vm.$nextTick();

      // Check that the material content renders (first sentence of first paragraph)
      expect(wrapper.text()).toContain("AI is transforming translation");
    });

    it("does NOT show connecting overlay", async () => {
      const wrapper = mountAndSetState({ status: "live" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).not.toContain("Connecting...");
    });

    it("shows 'Listening...' status text by default (neither speaking)", async () => {
      const wrapper = mountAndSetState({ status: "live" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('"Listening..."');
    });

    it("shows 'Speaking...' when model is speaking", async () => {
      const wrapper = mountAndSetState({
        status: "live",
        isModelSpeaking: true,
        isUserSpeaking: false,
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('"Speaking..."');
    });

    it("shows 'Listening...' when user is speaking", async () => {
      const wrapper = mountAndSetState({
        status: "live",
        isUserSpeaking: true,
        isModelSpeaking: false,
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('"Listening..."');
    });
  });

  // -----------------------------------------------------------------------
  // 5. Ended state
  // -----------------------------------------------------------------------
  describe("when status is ended", () => {
    it("does NOT show waveform bars", async () => {
      const wrapper = mountAndSetState({ status: "ended" });
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".waveform-bar").length).toBe(0);
    });

    it("does NOT show LIVE badge, shows 'ended' text", async () => {
      const wrapper = mountAndSetState({ status: "ended" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).not.toContain("LIVE");
      expect(wrapper.text()).toContain("ended");
    });

    it("does NOT show lesson material", async () => {
      const wrapper = mountAndSetState({ status: "ended" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).not.toContain("Lesson Material");
    });

    it("does NOT show connecting overlay", async () => {
      const wrapper = mountAndSetState({ status: "ended" });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).not.toContain("Connecting...");
    });
  });

  // -----------------------------------------------------------------------
  // 6. Settings sheet and other static content
  // -----------------------------------------------------------------------
  it("renders Session Settings text (hidden off-screen by default)", () => {
    render(CallScreen);
    expect(screen.getByText("Session Settings")).toBeInTheDocument();
  });

  it("renders New session and Play Last TTS buttons in settings", () => {
    render(CallScreen);
    expect(screen.getByText("New session")).toBeInTheDocument();
    expect(screen.getByText("Play Last TTS")).toBeInTheDocument();
  });
});
