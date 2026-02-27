<template>
  <div class="relative flex h-dvh w-full max-w-md mx-auto flex-col overflow-hidden font-display">
    <!-- Header -->
    <header class="flex items-center p-3 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] justify-between shrink-0">
      <div class="flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
        <span class="text-sm font-bold text-slate-800 dark:text-white">{{ timer }}</span>
      </div>
      <h2 class="text-slate-800 dark:text-slate-100 text-sm font-semibold tracking-widest uppercase">Talky Live</h2>
      <div
        v-if="status === 'live'"
        class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
      >
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">LIVE</span>
      </div>
      <div v-else class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <span class="relative flex h-2 w-2">
          <span class="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
        </span>
        <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{{ status }}</span>
      </div>
    </header>

    <!-- Connecting Overlay -->
    <div v-if="status === 'connecting'" class="absolute inset-0 z-20 grid place-items-center pointer-events-none bg-white/40 dark:bg-background-dark/40">
      <div class="min-w-[220px] p-5 rounded-2xl grid justify-items-center gap-2 bg-white/95 dark:bg-slate-800/95 border border-secondary/30 shadow-xl" role="status" aria-label="Connecting">
        <span class="text-slate-800 dark:text-white text-lg font-bold tracking-tight">Connecting...</span>
        <span class="text-slate-500 dark:text-slate-400 text-xs font-semibold">Please wait before speaking</span>
        <span class="inline-flex items-center gap-1.5 mt-1" aria-hidden="true">
          <i class="w-2 h-2 rounded-full bg-primary" style="animation: connecting-bounce 1s ease-in-out infinite"></i>
          <i class="w-2 h-2 rounded-full bg-primary" style="animation: connecting-bounce 1s ease-in-out infinite 0.14s"></i>
          <i class="w-2 h-2 rounded-full bg-primary" style="animation: connecting-bounce 1s ease-in-out infinite 0.28s"></i>
        </span>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center px-4 sm:px-6 justify-between py-4">
      <!-- Waveform Bars (visible when live) -->
      <div v-if="status === 'live'" class="w-full flex items-center justify-center gap-1 h-12 sm:h-16 mt-2">
        <div
          v-for="(bar, i) in waveformBars"
          :key="i"
          class="waveform-bar w-1.5 rounded-full"
          :class="bar.bgClass"
          :style="{ height: bar.height, animationDelay: bar.delay }"
        ></div>
      </div>
      <div v-else class="h-12 sm:h-16 mt-2"></div>

      <!-- Lesson Material Card -->
      <div
        v-if="showLessonMaterial"
        class="w-full max-w-sm mx-auto rounded-3xl bg-primary/10 border border-primary/20 h-[50dvh] overflow-hidden flex flex-col px-5 sm:px-8 py-8 sm:py-16"
      >
        <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 text-center shrink-0">Lesson Material</h3>
        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
          <p class="text-slate-700 dark:text-slate-200 text-sm leading-relaxed text-center font-medium whitespace-pre-line">
            {{ materialDisplayText }}
          </p>
        </div>
      </div>
      <div v-else class="flex-1"></div>

      <!-- Status Text -->
      <div class="w-full max-w-xs mx-auto mb-4">
        <p v-if="status === 'live'" class="text-slate-500 dark:text-slate-400 text-sm italic font-light leading-relaxed text-center tracking-wide">
          {{ statusDisplayText }}
        </p>
      </div>
    </main>

    <!-- Control Bar -->
    <ControlBar
      :call-active="isCallActive"
      @toggleCall="toggleCall"
      @toggleChat="toggleChat"
      @toggleMenu="toggleMenu"
    />

    <!-- Deco blur circles -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Chat Panel -->
    <ChatPanel
      :open="isChatOpen"
      :log="mergedConversationLog"
      @close="toggleChat"
    />

    <!-- Settings Sheet -->
    <section
      class="absolute left-0 right-0 bottom-0 z-30 bg-white/95 dark:bg-background-dark/95 rounded-t-3xl border-t border-secondary/20 shadow-xl p-4 sm:p-5 transition-transform duration-300"
      :class="isSettingsOpen ? 'translate-y-0' : 'translate-y-[105%]'"
    >
      <div class="flex items-center justify-between text-slate-800 dark:text-white font-bold">
        <span>Session Settings</span>
        <button class="px-3 py-1.5 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-secondary/10 transition-colors" @click="toggleMenu">Close</button>
      </div>
      <div class="flex flex-wrap gap-2.5 mt-3">
        <button class="px-3 py-1.5 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-secondary/10 transition-colors" @click="resetSession">New session</button>
        <button class="px-3 py-1.5 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-secondary/10 transition-colors" @click="playLastTts">Play Last TTS</button>
        <button
          v-if="isDebugModeEnabled"
          class="px-3 py-1.5 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-secondary/10 transition-colors"
          @click="openAdminPanel"
        >
          Admin Mode
        </button>
      </div>
      <div class="mt-4 bg-primary/5 border border-primary/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs leading-relaxed p-3">
        {{ analysis || "End the call to request analysis." }}
      </div>
    </section>

    <!-- Admin Panel -->
    <section
      v-if="isDebugModeEnabled && isAdminPanelOpen"
      class="fixed inset-3 z-[90] grid place-items-center bg-slate-900/30 backdrop-blur-sm"
      aria-label="Admin Mode"
    >
      <div class="w-full max-w-5xl h-[min(90vh,calc(100dvh-32px))] bg-white dark:bg-slate-900 rounded-2xl border border-secondary/20 shadow-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between text-slate-800 dark:text-white font-bold">
          <span>Admin Mode</span>
          <button class="px-3 py-1.5 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-secondary/10 transition-colors" @click="closeAdminPanel">Close</button>
        </div>
        <div class="flex-1 min-h-0 grid grid-rows-2 gap-3">
          <label class="flex flex-col gap-1.5 min-h-0">
            <div class="flex items-center justify-between gap-2.5">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">System Prompt</span>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-secondary/10 transition-colors"
                @click="resetAdminPrompt"
              >
                Reset
              </button>
            </div>
            <textarea
              v-model="adminPrompt"
              class="w-full h-full min-h-0 resize-none border border-secondary/20 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl p-3 text-xs leading-relaxed font-mono"
              spellcheck="false"
            ></textarea>
          </label>
          <label class="flex flex-col gap-1.5 min-h-0">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Console Logs</span>
            <textarea
              class="w-full h-full min-h-0 resize-none border border-slate-700 bg-slate-900 text-slate-300 rounded-xl p-3 text-xs leading-relaxed font-mono"
              :value="adminLogText"
              readonly
              spellcheck="false"
            ></textarea>
          </label>
        </div>
      </div>
    </section>

    <InterestPopup
      v-if="showInterestPopup && status === 'idle'"
      :is-loading="isGeneratingLesson"
      :error-message="lessonGenerationError"
      @start="handleInterestStart"
    />
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import ControlBar from "./ControlBar.vue";
import ChatPanel from "./ChatPanel.vue";
import InterestPopup from "./InterestPopup.vue";
import { GeminiLiveSession } from "../services/geminiLive";
import { SessionArchive } from "../services/sessionArchive";
import { generateLesson } from "../services/lessonGenerator";
import {
  DEFAULT_LESSON_MATERIAL,
  DEFAULT_SYSTEM_INSTRUCTION,
  buildSystemInstruction,
} from "../config/systemPrompt";

const timer = ref("00:00");
const seconds = ref(0);
let timerId = null;
let callRequestSeq = 0;

const isChatOpen = ref(false);
const isSettingsOpen = ref(false);
const isModelSpeaking = ref(false);
const isUserSpeaking = ref(false);
const status = ref("idle");
const isCallTransitioning = ref(false);
const isAdminPanelOpen = ref(false);
const showInterestPopup = ref(true);
const lessonMaterial = ref("");
const isGeneratingLesson = ref(false);
const lessonGenerationError = ref("");
const materialDisplayText = computed(() => lessonMaterial.value.trim());

const statusDisplayText = computed(() => {
  if (isUserSpeaking.value) return '"Listening..."';
  if (isModelSpeaking.value) return '"Speaking..."';
  return '"Listening..."';
});

const waveformBars = [
  { height: "0.5rem", bgClass: "bg-primary/20", delay: "0.1s" },
  { height: "0.75rem", bgClass: "bg-primary/30", delay: "0.2s" },
  { height: "1rem", bgClass: "bg-primary/40", delay: "0.3s" },
  { height: "1.5rem", bgClass: "bg-primary/50", delay: "0.4s" },
  { height: "0.75rem", bgClass: "bg-primary/60", delay: "0.5s" },
  { height: "1.25rem", bgClass: "bg-primary/70", delay: "0.6s" },
  { height: "2rem", bgClass: "bg-primary", delay: "0.7s" },
  { height: "1.5rem", bgClass: "bg-primary/80", delay: "0.8s" },
  { height: "1.75rem", bgClass: "bg-primary/60", delay: "0.9s" },
  { height: "1rem", bgClass: "bg-primary/40", delay: "1.0s" },
  { height: "1.5rem", bgClass: "bg-primary/60", delay: "1.1s" },
  { height: "2rem", bgClass: "bg-primary", delay: "0.2s" },
  { height: "1.25rem", bgClass: "bg-primary/70", delay: "0.3s" },
  { height: "1.75rem", bgClass: "bg-primary/50", delay: "0.4s" },
  { height: "0.75rem", bgClass: "bg-primary/30", delay: "0.5s" },
  { height: "1.25rem", bgClass: "bg-primary/40", delay: "0.6s" },
  { height: "1.75rem", bgClass: "bg-primary/60", delay: "0.7s" },
  { height: "2rem", bgClass: "bg-primary", delay: "0.8s" },
  { height: "1.5rem", bgClass: "bg-primary/80", delay: "0.9s" },
  { height: "1.25rem", bgClass: "bg-primary/70", delay: "1.0s" },
  { height: "1.75rem", bgClass: "bg-primary/50", delay: "1.1s" },
  { height: "1rem", bgClass: "bg-primary/40", delay: "0.1s" },
  { height: "0.75rem", bgClass: "bg-primary/30", delay: "0.2s" },
  { height: "0.5rem", bgClass: "bg-primary/20", delay: "0.3s" },
];

const FIXED_MODEL_ID = "gemini-2.5-flash-native-audio-preview-12-2025";
const apiBase = import.meta.env.DEV
  ? ""
  : "https://ephemeral-token-service-399277644361.asia-northeast3.run.app";
const tokenApiUrl = `${apiBase}/api/ephemeral-token`;
const analysisApiUrl = "";
const NETWORK_TIMEOUT_MS = 12000;
const MIC_TIMEOUT_MS = 12000;
const MAX_CONVERSATION_TURNS = 200;
const MERGE_SAME_SPEAKER_GAP_MS = 5000;
const sessionId = ref(
  localStorage.getItem("talky:last_session_id") ||
    (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
);
const loadedConversationLog = loadLog(sessionId.value);
const conversationLog = ref(applyConversationPolicy(loadedConversationLog));
if (conversationLog.value.length !== loadedConversationLog.length) {
  saveLog(sessionId.value, conversationLog.value);
}
const analysis = ref("");
const archiveReady = ref(false);
const adminPrompt = ref(DEFAULT_SYSTEM_INSTRUCTION);
const adminLogLines = ref([]);
const MAX_ADMIN_LOG_CHARS = 1000;
const adminLogText = computed(() => {
  const text = adminLogLines.value.join("\n");
  return text.length > MAX_ADMIN_LOG_CHARS
    ? text.slice(-MAX_ADMIN_LOG_CHARS)
    : text;
});
const isDebugModeEnabled =
  new URLSearchParams(window.location.search).get("debug") === "true";
const MAX_ADMIN_LOG_LINES = 2000;
let restoreConsoleLog = null;

if (isDebugModeEnabled) {
  const originalConsoleLog = console.log.bind(console);
  console.log = (...args) => {
    adminLogLines.value.push(formatLogArgs(args));
    if (adminLogLines.value.length > MAX_ADMIN_LOG_LINES) {
      adminLogLines.value.splice(
        0,
        adminLogLines.value.length - MAX_ADMIN_LOG_LINES
      );
    }
    originalConsoleLog(...args);
  };
  restoreConsoleLog = () => {
    console.log = originalConsoleLog;
  };
}

const archive = new SessionArchive({
  apiBase,
  onError: (err) => {
    console.error("[Archive] upload failed", err);
  },
});

const session = new GeminiLiveSession({
  modelId: FIXED_MODEL_ID,
  apiVersion: "v1alpha",
  onTranscript: (entry) => {
    appendConversationEntry(entry);
    saveLog(sessionId.value, conversationLog.value);
    archive.ingestTranscript(entry);
  },
  onModelAudioChunk: (chunk) => {
    archive.ingestModelAudio(chunk);
  },
  onStatus: (state) => {
    if (state === "error") {
      status.value = "error";
    }
    if (state === "closed") {
      status.value = "closed";
      isUserSpeaking.value = false;
      isModelSpeaking.value = false;
    }
  },
  onAudioStart: () => {
    isModelSpeaking.value = true;
    isUserSpeaking.value = false;
  },
  onAudioEnd: () => {
    isModelSpeaking.value = false;
  },
  onUserSpeechStart: () => {
    isUserSpeaking.value = true;
  },
  onUserSpeechEnd: () => {
    isUserSpeaking.value = false;
  },
});

const isCallActive = computed(
  () => status.value === "connecting" || status.value === "live"
);
const showLessonMaterial = computed(
  () =>
    Boolean(lessonMaterial.value.trim()) &&
    (status.value === "idle" || status.value === "live")
);
const mergedConversationLog = computed(() => conversationLog.value);

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds.value += 1;
    timer.value = formatTime(seconds.value);
  }, 1000);
}

function stopTimer() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

async function postJsonWithTimeout(url, body, timeoutMs, label) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function handleInterestStart(interest) {
  const topic = typeof interest === "string" ? interest.trim() : "";
  if (!topic || isGeneratingLesson.value) return;

  lessonGenerationError.value = "";
  isGeneratingLesson.value = true;
  try {
    const generatedLesson = await generateLesson(topic, { apiBase });
    const resolvedLesson = generatedLesson.trim() || DEFAULT_LESSON_MATERIAL;
    console.log("[CallScreen] lesson material resolved", {
      topic,
      lessonMaterial: resolvedLesson,
    });
    lessonMaterial.value = resolvedLesson;
    adminPrompt.value = buildSystemInstruction(resolvedLesson);
    showInterestPopup.value = false;
  } catch (err) {
    console.error("[CallScreen] handleInterestStart failed", err);
    lessonGenerationError.value =
      "강의자료를 생성하지 못해 기본 자료로 시작합니다.";
    lessonMaterial.value = DEFAULT_LESSON_MATERIAL;
    adminPrompt.value = buildSystemInstruction(DEFAULT_LESSON_MATERIAL);
    showInterestPopup.value = false;
  } finally {
    isGeneratingLesson.value = false;
  }
}

async function startCall() {
  if (status.value === "live" || status.value === "connecting") return;
  if (showInterestPopup.value || isGeneratingLesson.value) return;
  if (!lessonMaterial.value.trim()) {
    showInterestPopup.value = true;
    return;
  }
  const requestSeq = ++callRequestSeq;
  status.value = "connecting";
  session.setSystemInstruction(adminPrompt.value);
  try {
    console.log("[CallScreen] startCall:begin", { requestSeq });
    localStorage.setItem("talky:last_session_id", sessionId.value);
    console.log("[CallScreen] startCall:startMic");
    await withTimeout(session.startMic(), MIC_TIMEOUT_MS, "Microphone start");
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }

    const createController = new AbortController();
    const createTimeoutId = window.setTimeout(
      () => createController.abort(),
      NETWORK_TIMEOUT_MS
    );
    try {
      console.log("[CallScreen] startCall:createSession");
      await archive.createSession(FIXED_MODEL_ID, createController.signal);
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error(`Session create timed out after ${NETWORK_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      window.clearTimeout(createTimeoutId);
    }
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    archiveReady.value = true;
    console.log("[CallScreen] startCall:tokenRequest");
    const response = await postJsonWithTimeout(
      tokenApiUrl,
      null,
      NETWORK_TIMEOUT_MS,
      "Token request"
    );
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Token request failed (${response.status}): ${bodyText}`);
    }
    const data = await response.json();
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    console.log("[CallScreen] startCall:connect");
    await session.connect({
      modelId: FIXED_MODEL_ID,
      ephemeralToken: data.token,
    });
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    status.value = "live";
    console.log("[CallScreen] startCall:live");
    startTimer();
  } catch (err) {
    console.error("[CallScreen] startCall failed", err);
    if (requestSeq === callRequestSeq) {
      session.stop();
      status.value = "error";
    }
  }
}

async function endCall() {
  callRequestSeq += 1;
  session.stop();
  stopTimer();
  status.value = "ended";
  isModelSpeaking.value = false;
  isUserSpeaking.value = false;
  void (async () => {
    if (archiveReady.value) {
      try {
        await archive.finalize(FIXED_MODEL_ID);
      } catch (err) {
        console.error("[Archive] finalize failed", err);
      }
    }
    await analyzeConversation();
  })();
}

async function toggleCall() {
  if (isCallTransitioning.value) return;
  isCallTransitioning.value = true;
  try {
    if (isCallActive.value) {
      await endCall();
      return;
    }
    await startCall();
  } finally {
    isCallTransitioning.value = false;
  }
}

function toggleChat() {
  isChatOpen.value = !isChatOpen.value;
  if (isChatOpen.value) isSettingsOpen.value = false;
}

function toggleMenu() {
  isSettingsOpen.value = !isSettingsOpen.value;
  if (isSettingsOpen.value) isChatOpen.value = false;
}

function openAdminPanel() {
  isAdminPanelOpen.value = true;
}

function closeAdminPanel() {
  isAdminPanelOpen.value = false;
}

function resetAdminPrompt() {
  adminPrompt.value = buildSystemInstruction(
    lessonMaterial.value.trim() || DEFAULT_LESSON_MATERIAL
  );
}

async function analyzeConversation() {
  if (!conversationLog.value.length) {
    analysis.value = "No transcript captured.";
    return;
  }
  if (!analysisApiUrl) {
    analysis.value = "Analysis backend is not configured.";
    return;
  }
  try {
    const response = await fetch(analysisApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId.value,
        log: conversationLog.value,
      }),
    });
    if (!response.ok) throw new Error("Analysis request failed");
    const data = await response.json();
    analysis.value = data.summary || "Analysis complete.";
  } catch (err) {
    analysis.value =
      "Analysis not configured. Send conversationLog to your GPT backend.";
  }
}

function resetSession() {
  conversationLog.value = [];
  analysis.value = "";
  status.value = "idle";
  stopTimer();
  seconds.value = 0;
  timer.value = formatTime(0);
  sessionId.value =
    crypto.randomUUID?.() || `session-${Date.now().toString(36)}`;
  saveLog(sessionId.value, conversationLog.value);
  archiveReady.value = false;
  lessonMaterial.value = "";
  lessonGenerationError.value = "";
  isGeneratingLesson.value = false;
  showInterestPopup.value = true;
  adminPrompt.value = DEFAULT_SYSTEM_INSTRUCTION;
}

async function playLastTts() {
  try {
    const ok = await archive.playLastModelAudio();
    if (!ok) {
      analysis.value = "No recorded model audio found yet.";
    }
  } catch (err) {
    console.error("[Archive] playback failed", err);
    analysis.value = "Playback failed.";
  }
}

onBeforeUnmount(() => {
  session.stop();
  stopTimer();
  restoreConsoleLog?.();
});

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function loadLog(id) {
  try {
    const raw = localStorage.getItem(`talky:session:${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveLog(id, log) {
  localStorage.setItem(`talky:session:${id}`, JSON.stringify(log));
}

function appendConversationEntry(entry) {
  conversationLog.value = applyConversationPolicy([
    ...conversationLog.value,
    entry,
  ]);
}

function applyConversationPolicy(entries) {
  const merged = mergeConversationEntries(entries);
  if (merged.length <= MAX_CONVERSATION_TURNS) return merged;
  return merged.slice(-MAX_CONVERSATION_TURNS);
}

function mergeConversationEntries(entries) {
  const merged = [];
  for (const rawEntry of entries || []) {
    if (!rawEntry || typeof rawEntry.text !== "string") continue;
    const text = rawEntry.text.trim();
    if (!text) continue;
    const speaker =
      typeof rawEntry.speaker === "string" && rawEntry.speaker
        ? rawEntry.speaker
        : "unknown";
    const ts = Number(rawEntry.ts) || Date.now();
    const last = merged[merged.length - 1];

    if (
      last &&
      last.speaker === speaker &&
      shouldMergeIntoLast(last, text, ts)
    ) {
      last.text = joinTranscriptText(last.text, text);
      last.ts = ts;
      continue;
    }

    merged.push({
      speaker,
      text,
      ts,
    });
  }
  return merged;
}

function shouldMergeIntoLast(last, nextText, nextTs) {
  const lastTs = Number(last.ts) || nextTs;
  if (nextTs - lastTs > MERGE_SAME_SPEAKER_GAP_MS) return false;
  if (/[.!?]\s*$/.test(last.text) && /^[A-Z]/.test(nextText)) return false;
  return true;
}

function joinTranscriptText(previous, next) {
  if (!previous) return next;
  if (!next) return previous;
  if (/\s$/.test(previous) || /^\s/.test(next)) return `${previous}${next}`;
  if (/^[,.;:!?)]/.test(next)) return `${previous}${next}`;
  if (/[([{/]$/.test(previous)) return `${previous}${next}`;
  return `${previous} ${next}`;
}

function formatLogArgs(args) {
  return args.map(formatLogArg).join(" ");
}

function formatLogArg(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
</script>
