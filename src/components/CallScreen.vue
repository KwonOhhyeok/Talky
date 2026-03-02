<template>
  <div class="relative flex h-dvh w-full max-w-md mx-auto flex-col overflow-hidden font-display">
    <!-- Header -->
    <header class="flex items-center p-3 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] justify-between shrink-0">
      <div class="flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 dark:bg-white/10 dark:border-white/20">
        <span class="text-sm font-bold text-navy dark:text-white">{{ timer }}</span>
      </div>
      <h2 class="text-navy dark:text-white text-sm font-semibold tracking-widest uppercase">Talky Live</h2>
      <div
        v-if="status === 'live'"
        class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/10 border border-teal/20"
        aria-live="polite"
        aria-atomic="true"
      >
        <span class="relative flex h-2 w-2" aria-hidden="true">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-teal"></span>
        </span>
        <span class="text-[10px] font-bold text-teal tracking-wider">LIVE</span>
      </div>
      <div
        v-else
        class="flex items-center gap-1.5 px-3 py-1 rounded-full border"
        :class="statusBadgeClass"
        aria-live="polite"
        aria-atomic="true"
      >
        <span class="relative flex h-2 w-2" aria-hidden="true">
          <span class="relative inline-flex rounded-full h-2 w-2" :class="statusDotClass"></span>
        </span>
        <span class="text-[10px] font-bold tracking-wider uppercase">{{ statusLabel }}</span>
      </div>
    </header>

    <!-- Connecting Overlay -->
    <div v-if="status === 'connecting'" class="absolute inset-0 z-20 grid place-items-center bg-white/40 dark:bg-navy/40">
      <div class="min-w-[220px] p-5 rounded-2xl grid justify-items-center gap-2 bg-white dark:bg-navy border border-navy/10 dark:border-white/10 shadow-xl" role="status">
        <span class="text-navy dark:text-white text-lg font-bold tracking-tight">{{ connectingStepText }}</span>
        <span class="text-navy/60 dark:text-white/60 text-xs font-semibold">잠시만 기다려 주세요</span>
        <span class="inline-flex items-center gap-1.5 mt-1" aria-hidden="true">
          <i class="w-2 h-2 rounded-full bg-yellow" style="animation: connecting-bounce 1s ease-in-out infinite"></i>
          <i class="w-2 h-2 rounded-full bg-yellow" style="animation: connecting-bounce 1s ease-in-out infinite 0.14s"></i>
          <i class="w-2 h-2 rounded-full bg-yellow" style="animation: connecting-bounce 1s ease-in-out infinite 0.28s"></i>
        </span>
        <button
          class="mt-3 px-5 py-2 rounded-lg bg-navy/10 dark:bg-white/10 text-navy dark:text-white text-xs font-bold hover:bg-navy/20 dark:hover:bg-white/20 transition-colors"
          @click="cancelConnecting"
        >
          취소
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center px-4 sm:px-6 justify-between py-4 min-h-0">

      <!-- Session Summary (ended 상태) -->
      <template v-if="status === 'ended'">
        <div class="flex-1 w-full overflow-y-auto" style="overscroll-behavior: contain">
          <SessionSummary
            :duration-seconds="seconds"
            :turn-count="conversationLog.length - sessionStartTurnCount"
            :lesson-topic="selectedTopic"
            @viewChat="openChat"
            @practiceAgain="practiceAgain"
            @newTopic="resetSession"
          />
        </div>
      </template>

      <!-- 에러 상태 -->
      <template v-else-if="status === 'error' || status === 'closed'">
        <div class="flex-1 w-full flex flex-col items-center justify-center gap-5 px-2">
          <div class="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-4xl text-red">error</span>
          </div>
          <div class="text-center">
            <h3 class="text-navy dark:text-white font-bold text-lg">{{ errorInfo.title }}</h3>
            <p class="text-navy/60 dark:text-white/60 text-sm mt-1 leading-relaxed">{{ errorInfo.message }}</p>
          </div>
          <button
            class="px-8 py-3 rounded-xl bg-blue text-white font-bold text-sm hover:shadow-lg hover:shadow-blue/25 active:scale-[0.98] transition-all"
            @click="startCall"
          >
            다시 시도
          </button>
        </div>
      </template>

      <!-- 일반 상태 (idle / live / connecting) -->
      <template v-else>
        <!-- Waveform Bars (live 또는 connecting 시) -->
        <div
          v-if="status === 'live' || status === 'connecting'"
          class="w-full flex items-center justify-center gap-1 h-12 sm:h-16 mt-2"
          aria-hidden="true"
        >
          <div
            v-for="(bar, i) in waveformBars"
            :key="i"
            class="waveform-bar w-1.5 rounded-full transition-opacity duration-300"
            :class="[bar.bgClass, isModelSpeaking ? 'opacity-100' : 'opacity-30']"
            :style="{
              height: bar.height,
              animationDelay: bar.delay,
              animationPlayState: isModelSpeaking ? 'running' : 'paused'
            }"
          ></div>
        </div>
        <div v-else class="h-12 sm:h-16 mt-2"></div>

        <!-- Lesson Material Card -->
        <div
          v-if="showLessonMaterial"
          class="w-full max-w-sm mx-auto rounded-3xl bg-navy/5 border border-navy/10 dark:bg-white/5 dark:border-white/10 h-[50dvh] overflow-hidden flex flex-col px-5 sm:px-8 py-8 sm:py-16"
        >
          <h3 class="text-[10px] font-bold text-navy/40 dark:text-white/40 uppercase tracking-[0.2em] mb-3 text-center shrink-0">Lesson Material</h3>

          <!-- idle 상태에서 행동 유도 안내 문구 -->
          <p v-if="status === 'idle'" class="text-[11px] text-navy/40 dark:text-white/40 text-center mb-4 shrink-0">
            자료를 미리 읽어보세요. 준비되면 통화 버튼을 눌러 수업을 시작합니다.
          </p>

          <div class="flex-1 min-h-0 overflow-y-auto pr-1" style="overscroll-behavior: contain">
            <p class="text-navy dark:text-white text-sm leading-relaxed text-left font-medium whitespace-pre-line" lang="en">
              {{ materialDisplayText }}
            </p>
          </div>
        </div>
        <div v-else class="flex-1"></div>

        <!-- Status Text (live 상태에서만) -->
        <div class="w-full max-w-xs mx-auto mb-4" aria-live="polite" aria-atomic="true">
          <p v-if="status === 'live'" class="text-navy/60 dark:text-white/60 text-sm italic font-light leading-relaxed text-center tracking-wide">
            {{ statusDisplayText }}
          </p>
          <transition name="hint-fade">
            <div
              v-if="status === 'live' && isFirstLiveHint"
              class="w-full mt-2 px-4 py-3 rounded-2xl bg-yellow/10 border border-yellow/30 text-center cursor-pointer"
              role="status"
              aria-live="polite"
              tabindex="0"
              @click="dismissFirstLiveHint"
              @keydown.enter.prevent="dismissFirstLiveHint"
              @keydown.space.prevent="dismissFirstLiveHint"
            >
              <p class="text-navy dark:text-white text-xs font-semibold leading-relaxed">
                👋 가볍게 인사해 보세요!
              </p>
              <p class="text-navy/60 dark:text-white/50 text-[11px] mt-0.5">
                예: "Hi Jesica! I'm [이름]."
              </p>
              <p class="text-navy/40 dark:text-white/30 text-[10px] mt-1">
                선생님이 대화를 이끌어 드릴게요.
              </p>
            </div>
          </transition>
        </div>
      </template>
    </main>

    <!-- Control Bar -->
    <ControlBar
      :call-active="isCallActive"
      @toggleCall="toggleCall"
      @toggleChat="toggleChat"
      @toggleMenu="toggleMenu"
    />

    <!-- Deco blur circles -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-teal/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Chat Panel -->
    <ChatPanel
      :open="isChatOpen"
      :log="mergedConversationLog"
      @close="toggleChat"
    />

    <!-- Settings Sheet -->
    <section
      class="absolute left-0 right-0 bottom-0 z-30 bg-white/95 dark:bg-navy/95 rounded-t-3xl border-t border-navy/10 dark:border-white/10 shadow-xl p-4 sm:p-5 transition-transform duration-300"
      :class="isSettingsOpen ? 'translate-y-0' : 'translate-y-[105%]'"
      role="dialog"
      aria-modal="true"
      aria-label="설정"
    >
      <div class="flex items-center justify-between text-navy dark:text-white font-bold">
        <span>세션 설정</span>
        <button class="px-3 py-1.5 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-xs font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors" @click="toggleMenu">닫기</button>
      </div>
      <div class="flex flex-wrap gap-2.5 mt-3">
        <button class="px-3 py-1.5 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-xs font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors" @click="resetSession">새 세션 시작</button>
        <button class="px-3 py-1.5 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-xs font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors" @click="playLastTts">마지막 TTS 재생</button>
        <button
          v-if="isDebugModeEnabled"
          class="px-3 py-1.5 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-xs font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
          @click="openAdminPanel"
        >
          Admin Mode
        </button>
      </div>
      <div class="mt-4 bg-blue/5 border border-blue/10 rounded-xl text-navy/60 dark:text-white/60 text-xs leading-relaxed p-3">
        {{ analysis || "통화를 종료하면 분석을 요청합니다." }}
      </div>
    </section>

    <!-- Admin Panel -->
    <section
      v-if="isDebugModeEnabled && isAdminPanelOpen"
      class="fixed inset-3 z-[90] grid place-items-center bg-navy/40 backdrop-blur-sm"
      aria-label="Admin Mode"
    >
      <div class="w-full max-w-5xl h-[min(90vh,calc(100dvh-32px))] bg-white dark:bg-navy rounded-2xl border border-navy/10 dark:border-white/10 shadow-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between text-navy dark:text-white font-bold">
          <span>Admin Mode</span>
          <button class="px-3 py-1.5 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-xs font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors" @click="closeAdminPanel">Close</button>
        </div>
        <div class="flex-1 min-h-0 grid grid-rows-2 gap-3">
          <label class="flex flex-col gap-1.5 min-h-0">
            <div class="flex items-center justify-between gap-2.5">
              <span class="text-xs font-semibold text-navy/60 dark:text-white/60">System Prompt</span>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-[11px] font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
                @click="resetAdminPrompt"
              >
                Reset
              </button>
            </div>
            <textarea
              v-model="adminPrompt"
              class="w-full h-full min-h-0 resize-none border border-navy/10 bg-navy/5 dark:bg-white/5 text-navy dark:text-white rounded-xl p-3 text-xs leading-relaxed font-mono"
              spellcheck="false"
            ></textarea>
          </label>
          <label class="flex flex-col gap-1.5 min-h-0">
            <span class="text-xs font-semibold text-navy/60 dark:text-white/60">Console Logs</span>
            <textarea
              class="w-full h-full min-h-0 resize-none border border-white/20 bg-navy text-white rounded-xl p-3 text-xs leading-relaxed font-mono"
              :value="adminLogText"
              readonly
              spellcheck="false"
            ></textarea>
          </label>
        </div>
      </div>
    </section>

    <!-- 통화 종료 확인 다이얼로그 -->
    <div
      v-if="showEndCallConfirm"
      class="fixed inset-0 z-[80] grid place-items-center bg-navy/40 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label="통화 종료 확인"
    >
      <div class="w-full max-w-xs bg-white dark:bg-navy rounded-2xl border border-navy/10 dark:border-white/10 shadow-2xl p-6">
        <h3 class="text-navy dark:text-white font-bold text-center">수업을 끝내시겠습니까?</h3>
        <p class="text-navy/60 dark:text-white/60 text-sm text-center mt-1.5">종료하면 세션 요약을 확인할 수 있어요.</p>
        <div class="flex gap-3 mt-5">
          <button
            class="flex-1 py-2.5 rounded-xl border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white font-semibold text-sm hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
            @click="showEndCallConfirm = false"
          >
            계속하기
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl bg-red text-white font-bold text-sm hover:bg-red/90 transition-colors"
            @click="confirmEndCall"
          >
            종료
          </button>
        </div>
      </div>
    </div>

    <InterestPopup
      v-if="showInterestPopup && status === 'idle'"
      :is-loading="isGeneratingLesson"
      :error-message="lessonGenerationError"
      :loading-step="lessonGenerationStep"
      @start="handleInterestStart"
    />
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import ControlBar from "./ControlBar.vue";
import ChatPanel from "./ChatPanel.vue";
import InterestPopup from "./InterestPopup.vue";
import SessionSummary from "./SessionSummary.vue";
import { GeminiLiveSession } from "../services/geminiLive";
import { SessionArchive } from "../services/sessionArchive";
import { generateLesson } from "../services/lessonGenerator";
import {
  DEFAULT_LESSON_MATERIAL,
  DEFAULT_SYSTEM_INSTRUCTION,
  buildSystemInstruction,
} from "../config/systemPrompt";
import { classifyError, getDisconnectedError } from "../utils/errorClassifier";

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
const lessonGenerationStep = ref(0);
const selectedTopic = ref("");
const materialDisplayText = computed(() => lessonMaterial.value.trim());
const connectingStep = ref("");
const errorInfo = ref({ type: "", title: "오류 발생", message: "다시 시도해 주세요.", actions: ["retry"] });
const showEndCallConfirm = ref(false);
const sessionStartTurnCount = ref(0);
const isFirstLiveHint = ref(false);
let hintTimer = null;

// ---- 상태 라벨 매핑 ----
const STATUS_LABELS = {
  idle: "대기",
  connecting: "연결 중",
  live: "LIVE",
  ended: "수업 완료",
  error: "오류",
  closed: "연결 끊김",
};

const statusLabel = computed(() => STATUS_LABELS[status.value] ?? status.value);

const statusBadgeClass = computed(() => {
  switch (status.value) {
    case "ended":
      return "bg-teal/10 border-teal/30 text-teal";
    case "error":
    case "closed":
      return "bg-red/10 border-red/30 text-red";
    case "connecting":
      return "bg-yellow/10 border-yellow/40 text-navy dark:text-white";
    default:
      return "bg-navy/10 border-navy/20 text-navy/60 dark:bg-white/10 dark:border-white/20 dark:text-white/60";
  }
});

const statusDotClass = computed(() => {
  switch (status.value) {
    case "ended": return "bg-teal";
    case "error": case "closed": return "bg-red";
    case "connecting": return "bg-yellow";
    default: return "bg-navy/40 dark:bg-white/40";
  }
});

// ---- 연결 단계 텍스트 ----
const connectingStepText = computed(() => connectingStep.value || "연결 중...");

const statusDisplayText = computed(() => {
  if (isModelSpeaking.value) return "선생님이 말하고 있어요";
  if (isUserSpeaking.value) return "선생님이 듣고 있어요";
  return "먼저 말을 걸어보세요";
});

const waveformBars = [
  { height: "0.5rem", bgClass: "bg-blue/20", delay: "0.1s" },
  { height: "0.75rem", bgClass: "bg-blue/30", delay: "0.2s" },
  { height: "1rem", bgClass: "bg-blue/40", delay: "0.3s" },
  { height: "1.5rem", bgClass: "bg-blue/50", delay: "0.4s" },
  { height: "0.75rem", bgClass: "bg-blue/60", delay: "0.5s" },
  { height: "1.25rem", bgClass: "bg-blue/70", delay: "0.6s" },
  { height: "2rem", bgClass: "bg-blue", delay: "0.7s" },
  { height: "1.5rem", bgClass: "bg-blue/80", delay: "0.8s" },
  { height: "1.75rem", bgClass: "bg-blue/60", delay: "0.9s" },
  { height: "1rem", bgClass: "bg-blue/40", delay: "1.0s" },
  { height: "1.5rem", bgClass: "bg-blue/60", delay: "1.1s" },
  { height: "2rem", bgClass: "bg-blue", delay: "0.2s" },
  { height: "1.25rem", bgClass: "bg-blue/70", delay: "0.3s" },
  { height: "1.75rem", bgClass: "bg-blue/50", delay: "0.4s" },
  { height: "0.75rem", bgClass: "bg-blue/30", delay: "0.5s" },
  { height: "1.25rem", bgClass: "bg-blue/40", delay: "0.6s" },
  { height: "1.75rem", bgClass: "bg-blue/60", delay: "0.7s" },
  { height: "2rem", bgClass: "bg-blue", delay: "0.8s" },
  { height: "1.5rem", bgClass: "bg-blue/80", delay: "0.9s" },
  { height: "1.25rem", bgClass: "bg-blue/70", delay: "1.0s" },
  { height: "1.75rem", bgClass: "bg-blue/50", delay: "1.1s" },
  { height: "1rem", bgClass: "bg-blue/40", delay: "0.1s" },
  { height: "0.75rem", bgClass: "bg-blue/30", delay: "0.2s" },
  { height: "0.5rem", bgClass: "bg-blue/20", delay: "0.3s" },
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
      // 취소/정상 종료 후 세션이 뒤늦게 error를 발생시키면 무시
      if (status.value === "connecting" || status.value === "live") {
        errorInfo.value = { type: "session-error", title: "세션 오류", message: "세션 중 오류가 발생했습니다. 다시 시도해 주세요.", actions: ["retry"] };
        status.value = "error";
        dismissFirstLiveHint();
      }
    }
    if (state === "closed") {
      if (status.value === "live") {
        errorInfo.value = getDisconnectedError();
        status.value = "closed";
      }
      dismissFirstLiveHint();
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
    dismissFirstLiveHint();
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
    (status.value === "idle" || status.value === "live" || status.value === "connecting")
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

function clearHintTimer() {
  if (!hintTimer) return;
  window.clearTimeout(hintTimer);
  hintTimer = null;
}

function dismissFirstLiveHint() {
  isFirstLiveHint.value = false;
  clearHintTimer();
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
  lessonGenerationStep.value = 0;
  selectedTopic.value = topic;

  // 단계별 메시지 업데이트
  const stepTimer1 = setTimeout(() => { lessonGenerationStep.value = 1; }, 3000);
  const stepTimer2 = setTimeout(() => { lessonGenerationStep.value = 2; }, 8000);

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
    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);
    isGeneratingLesson.value = false;
    lessonGenerationStep.value = 0;
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
  connectingStep.value = "마이크 연결 중...";
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

    connectingStep.value = "세션 준비 중...";
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
    connectingStep.value = "토큰 발급 중...";
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
    connectingStep.value = "선생님 연결 중...";
    console.log("[CallScreen] startCall:connect");
    await session.connect({
      modelId: FIXED_MODEL_ID,
      ephemeralToken: data.token,
    });
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    sessionStartTurnCount.value = conversationLog.value.length;
    status.value = "live";
    connectingStep.value = "";
    isFirstLiveHint.value = true;
    clearHintTimer();
    hintTimer = window.setTimeout(() => {
      isFirstLiveHint.value = false;
      hintTimer = null;
    }, 10000);
    console.log("[CallScreen] startCall:live");
    startTimer();
  } catch (err) {
    console.error("[CallScreen] startCall failed", err);
    if (requestSeq === callRequestSeq) {
      session.stop();
      errorInfo.value = classifyError(err);
      status.value = "error";
      connectingStep.value = "";
      dismissFirstLiveHint();
    }
  }
}

function cancelConnecting() {
  callRequestSeq += 1;
  session.stop();
  status.value = "idle";
  connectingStep.value = "";
  dismissFirstLiveHint();
}

async function endCall() {
  callRequestSeq += 1;
  session.stop();
  stopTimer();
  status.value = "ended";
  isModelSpeaking.value = false;
  isUserSpeaking.value = false;
  dismissFirstLiveHint();
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
      // 5분 미만 통화 시 확인 다이얼로그 표시
      if (status.value === "live" && seconds.value < 300) {
        showEndCallConfirm.value = true;
        return;
      }
      await endCall();
      return;
    }
    await startCall();
  } finally {
    isCallTransitioning.value = false;
  }
}

async function confirmEndCall() {
  showEndCallConfirm.value = false;
  isCallTransitioning.value = true;
  try {
    await endCall();
  } finally {
    isCallTransitioning.value = false;
  }
}

function openChat() {
  isChatOpen.value = true;
  isSettingsOpen.value = false;
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

function practiceAgain() {
  // 타이머/상태만 초기화하고 같은 레슨 소재로 다시 시작
  analysis.value = "";
  status.value = "idle";
  stopTimer();
  seconds.value = 0;
  timer.value = formatTime(0);
  dismissFirstLiveHint();
  sessionId.value =
    crypto.randomUUID?.() || `session-${Date.now().toString(36)}`;
  archiveReady.value = false;
  startCall();
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
  dismissFirstLiveHint();
  showInterestPopup.value = true;
  adminPrompt.value = DEFAULT_SYSTEM_INSTRUCTION;
  selectedTopic.value = "";
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
  clearHintTimer();
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
  try {
    localStorage.setItem(`talky:session:${id}`, JSON.stringify(log));
  } catch (err) {
    console.error("[CallScreen] saveLog failed", err);
  }
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

<style scoped>
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
