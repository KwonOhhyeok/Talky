import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Mock heavy service dependencies (same pattern as CallScreen.test.js)
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

import CallScreen from "../components/CallScreen.vue";
import ControlBar from "../components/ControlBar.vue";
import ChatPanel from "../components/ChatPanel.vue";

const projectRoot = resolve(import.meta.dirname, "../..");

// ---------------------------------------------------------------------------
// Helper: mount CallScreen and override internal state via setupState
// ---------------------------------------------------------------------------
function mountCallScreenWithState(stateOverrides = {}) {
  const wrapper = mount(CallScreen);
  const state = wrapper.vm.$.setupState;
  for (const [key, value] of Object.entries(stateOverrides)) {
    state[key] = value;
  }
  return wrapper;
}

// ===========================================================================
// 1. index.html — viewport meta tag
// ===========================================================================
describe("index.html viewport meta tag", () => {
  const indexHtml = readFileSync(
    resolve(projectRoot, "index.html"),
    "utf-8"
  );

  it("contains viewport-fit=cover in the viewport meta tag", () => {
    // Match the meta viewport tag content attribute
    const viewportMatch = indexHtml.match(
      /<meta\s+name="viewport"\s+content="([^"]*)"/
    );
    expect(viewportMatch).not.toBeNull();

    const content = viewportMatch[1];
    expect(content).toContain("viewport-fit=cover");
  });

  it("retains width=device-width and initial-scale=1.0", () => {
    const viewportMatch = indexHtml.match(
      /<meta\s+name="viewport"\s+content="([^"]*)"/
    );
    const content = viewportMatch[1];
    expect(content).toContain("width=device-width");
    expect(content).toContain("initial-scale=1.0");
  });
});

// ===========================================================================
// 2. app.css — min-height: 100dvh (not 884px)
// ===========================================================================
describe("app.css body min-height", () => {
  const appCss = readFileSync(
    resolve(projectRoot, "src/styles/app.css"),
    "utf-8"
  );

  it("uses min-height: 100dvh for the body rule", () => {
    expect(appCss).toContain("min-height: 100dvh");
  });

  it("does NOT contain the old 884px min-height value", () => {
    expect(appCss).not.toContain("884px");
  });
});

// ===========================================================================
// 3. CallScreen.vue — responsive layout classes
// ===========================================================================
describe("CallScreen responsive layout classes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("uses h-dvh on the root container (not h-screen)", () => {
    const wrapper = mount(CallScreen);
    const root = wrapper.element;

    expect(root.className).toContain("h-dvh");
    expect(root.className).not.toContain("h-screen");
  });

  it("header has responsive padding: p-3 and sm:p-6", () => {
    const wrapper = mount(CallScreen);
    const header = wrapper.find("header");

    expect(header.classes()).toContain("p-3");
    expect(header.classes()).toContain("sm:p-6");
  });

  it("header uses safe-area-inset-top via pt style", () => {
    const wrapper = mount(CallScreen);
    const header = wrapper.find("header");

    // The class pt-[max(0.75rem,env(safe-area-inset-top))] should be present
    expect(header.element.className).toContain("safe-area-inset-top");
  });

  it("main content area has responsive horizontal padding: px-4 and sm:px-6", () => {
    const wrapper = mount(CallScreen);
    const main = wrapper.find("main");

    expect(main.classes()).toContain("px-4");
    expect(main.classes()).toContain("sm:px-6");
  });

  describe("waveform height is responsive when status is live", () => {
    it("waveform container has h-12 and sm:h-16 classes", async () => {
      const wrapper = mountCallScreenWithState({ status: "live" });
      await wrapper.vm.$nextTick();

      // The waveform container is the div that holds .waveform-bar elements
      const waveformContainer = wrapper.find(".waveform-bar").element
        .parentElement;

      expect(waveformContainer.className).toContain("h-12");
      expect(waveformContainer.className).toContain("sm:h-16");
    });
  });

  it("waveform placeholder (non-live) also has responsive height h-12 sm:h-16", () => {
    // In idle state, there's a placeholder div with the same height classes
    const wrapper = mount(CallScreen);
    const main = wrapper.find("main");

    // The placeholder is the first child div of main with h-12
    const placeholder = main.element.querySelector(".h-12");
    expect(placeholder).not.toBeNull();
    expect(placeholder.className).toContain("sm:h-16");
  });

  it("lesson material card has responsive padding: px-5 sm:px-8 py-8 sm:py-16", async () => {
    const wrapper = mountCallScreenWithState({
      status: "live",
      lessonMaterial: "Title\nSummary",
    });
    await wrapper.vm.$nextTick();

    // Find the lesson material card — it's the div containing the h3 with "Lesson Material"
    const heading = wrapper.findAll("h3").find((h) => h.text() === "Lesson Material");
    expect(heading).toBeDefined();

    // The card is the parent div of the heading
    const lessonCard = heading.element.parentElement;
    const classes = lessonCard.className;
    expect(classes).toContain("px-5");
    expect(classes).toContain("sm:px-8");
    expect(classes).toContain("py-8");
    expect(classes).toContain("sm:py-16");
  });

  it("settings sheet has responsive padding p-4 sm:p-5", () => {
    const wrapper = mount(CallScreen);

    // Settings section contains "Session Settings" text
    const settingsSection = wrapper
      .findAll("section")
      .find((s) => s.text().includes("Session Settings"));

    expect(settingsSection).toBeDefined();
    const classes = settingsSection.element.className;
    expect(classes).toContain("p-4");
    expect(classes).toContain("sm:p-5");
  });
});

// ===========================================================================
// 4. ControlBar.vue — responsive button sizes and safe-area-inset-bottom
// ===========================================================================
describe("ControlBar responsive layout classes", () => {
  it("footer has responsive padding with safe-area-inset-bottom", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });
    const footer = wrapper.find("footer");
    const classes = footer.element.className;

    // Base padding
    expect(classes).toContain("p-4");
    // Safe area inset bottom via pb-[max(...)]
    expect(classes).toContain("safe-area-inset-bottom");
    // sm: breakpoint padding
    expect(classes).toContain("sm:p-6");
  });

  it("call button has responsive size: size-16 and sm:size-20", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });
    const callButton = wrapper.find("[aria-label='Start call']");
    const classes = callButton.element.className;

    expect(classes).toContain("size-16");
    expect(classes).toContain("sm:size-20");
  });

  it("side buttons (chat and settings) have responsive size: size-12 and sm:size-14", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });

    const chatButton = wrapper.find("[aria-label='Toggle chat']");
    expect(chatButton.element.className).toContain("size-12");
    expect(chatButton.element.className).toContain("sm:size-14");

    const settingsButton = wrapper.find("[aria-label='Settings']");
    expect(settingsButton.element.className).toContain("size-12");
    expect(settingsButton.element.className).toContain("sm:size-14");
  });

  it("call button icon text has responsive size: text-2xl and sm:text-3xl", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });
    const callButton = wrapper.find("[aria-label='Start call']");
    const iconSpan = callButton.find(".material-symbols-outlined");

    expect(iconSpan.element.className).toContain("text-2xl");
    expect(iconSpan.element.className).toContain("sm:text-3xl");
  });
});

// ===========================================================================
// 5. ChatPanel.vue — responsive padding and text size
// ===========================================================================
describe("ChatPanel responsive layout classes", () => {
  it("root section has responsive padding: p-4 and sm:p-6", () => {
    const wrapper = mount(ChatPanel, {
      props: { open: true, log: [] },
    });
    const section = wrapper.find("section");

    expect(section.classes()).toContain("p-4");
    expect(section.classes()).toContain("sm:p-6");
  });

  it("conversation entry text has responsive size: text-xs and sm:text-sm", () => {
    const sampleLog = [
      { speaker: "user", text: "Hello!", ts: 1700000000000 },
    ];

    const wrapper = mount(ChatPanel, {
      props: { open: true, log: sampleLog },
    });

    // Entry divs have the text-xs sm:text-sm classes
    const entryDiv = wrapper.find("[class*='border-l-blue-500']");
    expect(entryDiv.exists()).toBe(true);

    const classes = entryDiv.element.className;
    expect(classes).toContain("text-xs");
    expect(classes).toContain("sm:text-sm");
  });
});
