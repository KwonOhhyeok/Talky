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

  it("header follows the sample top app bar sizing", () => {
    const wrapper = mount(CallScreen);
    const header = wrapper.find("header");

    expect(header.classes()).toContain("h-16");
    expect(header.classes()).toContain("px-h-padding");
  });

  it("header uses safe-area-inset-top via pt style", () => {
    const wrapper = mount(CallScreen);
    const header = wrapper.find("header");

    // The class pt-[max(0.75rem,env(safe-area-inset-top))] should be present
    expect(header.element.className).toContain("safe-area-inset-top");
  });

  it("main content area uses sample horizontal padding after topic selection", async () => {
    const wrapper = mountCallScreenWithState({
      showInterestPopup: false,
      lessonMaterial: "Lesson material",
    });
    await wrapper.vm.$nextTick();
    const main = wrapper.find("main");

    expect(main.classes()).toContain("px-h-padding");
    expect(main.classes()).toContain("pb-[112px]");
  });

  describe("live status indicator", () => {
    it("renders the sample speaking status when status is live", async () => {
      const wrapper = mountCallScreenWithState({
        status: "live",
        lessonMaterial: "Lesson material",
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("먼저 말을 걸어보세요");
      expect(wrapper.find(".pulse-subtle").exists()).toBe(true);
    });
  });

  it("lesson material card uses sample rounded card treatment", async () => {
    const wrapper = mountCallScreenWithState({
      status: "live",
      lessonMaterial: "Title\nSummary",
    });
    await wrapper.vm.$nextTick();

    const heading = wrapper.findAll("h2").find((h) => h.text() === "Lesson Material");
    expect(heading).toBeDefined();

    const lessonCard = wrapper.find("article");
    expect(lessonCard.classes()).toContain("rounded-xl");
    expect(lessonCard.classes()).toContain("border");
    expect(lessonCard.classes()).toContain("p-lg");
  });

  it("settings sheet has responsive padding p-4 sm:p-5", () => {
    const wrapper = mount(CallScreen);

    // 설정 섹션에는 "세션 설정" 텍스트가 포함된다.
    const settingsSection = wrapper
      .findAll("section")
      .find((s) => s.text().includes("세션 설정"));

    expect(settingsSection).toBeDefined();
    const classes = settingsSection.element.className;
    expect(classes).toContain("p-4");
    expect(classes).toContain("sm:p-5");
    expect(classes).toContain("min-h-[55dvh]");
    expect(classes).toContain("z-[70]");
  });
});

// ===========================================================================
// 4. ControlBar.vue — responsive button sizes and safe-area-inset-bottom
// ===========================================================================
describe("ControlBar responsive layout classes", () => {
  it("nav has fixed bottom layout with safe-area-inset-bottom", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });
    const nav = wrapper.find("nav");
    const classes = nav.element.className;

    expect(classes).toContain("safe-area-inset-bottom");
    expect(classes).toContain("fixed");
    expect(classes).toContain("h-[100px]");
  });

  it("call button has sample primary action size", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });
    const callButton = wrapper.find("[aria-label='Start call']");
    const classes = callButton.element.className;

    expect(classes).toContain("h-16");
    expect(classes).toContain("w-16");
  });

  it("side buttons (chat and settings) have sample icon button size", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });

    const chatButton = wrapper.find("[aria-label='Toggle chat']");
    expect(chatButton.element.className).toContain("h-14");
    expect(chatButton.element.className).toContain("w-14");

    const settingsButton = wrapper.find("[aria-label='Settings']");
    expect(settingsButton.element.className).toContain("h-14");
    expect(settingsButton.element.className).toContain("w-14");
  });

  it("call button icon text uses sample icon size", () => {
    const wrapper = mount(ControlBar, {
      props: { callActive: false },
    });
    const callButton = wrapper.find("[aria-label='Start call']");
    const iconSpan = callButton.find(".material-symbols-outlined");

    expect(iconSpan.element.className).toContain("text-3xl");
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
    const entryDiv = wrapper.find("[class*='border-l-blue']");
    expect(entryDiv.exists()).toBe(true);

    const classes = entryDiv.element.className;
    expect(classes).toContain("text-xs");
    expect(classes).toContain("sm:text-sm");
  });
});
