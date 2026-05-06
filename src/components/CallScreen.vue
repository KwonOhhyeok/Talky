<template>
  <div class="relative flex h-dvh min-h-dvh w-full flex-col overflow-hidden bg-background text-on-background font-body">
    <header class="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-grey-100 bg-surface/80 px-h-padding pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div class="flex w-1/3 items-center justify-start">
        <span class="font-subtitle text-subtitle text-secondary">{{ timer }}</span>
      </div>
      <div class="flex w-1/3 justify-center">
        <h1 class="font-display-large text-display-large text-primary tracking-tight">Talky</h1>
      </div>
      <div class="flex w-1/3 items-center justify-end gap-xs" aria-live="polite" aria-atomic="true">
        <span class="h-2 w-2 rounded-full" :class="statusDotClass"></span>
        <span class="font-subtitle text-subtitle text-on-surface">{{ statusLabel }}</span>
      </div>
    </header>

    <!-- Connecting Overlay -->
    <div v-if="status === 'connecting'" class="absolute inset-0 z-30 grid place-items-center bg-scrim px-h-padding backdrop-blur-sm">
      <div class="grid min-w-[220px] justify-items-center gap-sm rounded-xl border border-grey-200 bg-background-layered p-lg shadow-xl" role="status">
        <span class="font-heading text-heading text-on-surface">{{ connectingStepText }}</span>
        <span class="font-caption text-caption text-secondary">잠시만 기다려 주세요</span>
        <span class="inline-flex items-center gap-1.5 mt-1" aria-hidden="true">
          <i class="h-2 w-2 rounded-full bg-warning" style="animation: connecting-bounce 1s ease-in-out infinite"></i>
          <i class="h-2 w-2 rounded-full bg-warning" style="animation: connecting-bounce 1s ease-in-out infinite 0.14s"></i>
          <i class="h-2 w-2 rounded-full bg-warning" style="animation: connecting-bounce 1s ease-in-out infinite 0.28s"></i>
        </span>
        <button
          class="mt-sm rounded-lg bg-grey-100 px-md py-sm font-body-sm text-body-sm text-on-surface transition-colors hover:bg-grey-200"
          @click="cancelConnecting"
        >
          취소
        </button>
      </div>
    </div>

    <InterestPopup
      v-if="showInterestPopup && status === 'idle'"
      :is-loading="isGeneratingLesson"
      :error-message="lessonGenerationError"
      :loading-step="lessonGenerationStep"
      @start="handleInterestStart"
    />

    <main v-else class="flex-1 overflow-y-auto px-h-padding py-lg pb-[112px]" style="overscroll-behavior: contain">
      <template v-if="status === 'ended'">
        <SessionSummary
          :duration-seconds="seconds"
          :turn-count="conversationLog.length - sessionStartTurnCount"
          :lesson-topic="selectedTopic"
          @viewChat="openChat"
          @practiceAgain="practiceAgain"
          @newTopic="resetSession"
        />
      </template>

      <!-- 에러 상태 -->
      <template v-else-if="status === 'error' || status === 'closed'">
        <div class="mx-auto flex min-h-[calc(100dvh-176px)] w-full max-w-md flex-col items-center justify-center gap-lg">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
            <span class="material-symbols-outlined text-4xl text-error">error</span>
          </div>
          <div class="text-center">
            <h2 class="font-heading-lg text-heading-lg text-on-surface">{{ errorInfo.title }}</h2>
            <p class="mt-xs font-body text-body text-secondary">{{ errorInfo.message }}</p>
          </div>
          <button
            class="rounded-xl bg-primary px-xl py-md font-subtitle text-subtitle text-on-primary transition-colors hover:bg-blue-hover active:scale-[0.98]"
            @click="startCall"
          >
            다시 시도
          </button>
        </div>
      </template>

      <template v-else>
        <section class="mx-auto flex min-h-[calc(100dvh-192px)] w-full max-w-2xl flex-col justify-center gap-lg">
          <article
            v-if="showLessonMaterial"
            class="relative overflow-hidden rounded-xl border border-grey-200 bg-background-layered p-lg shadow-sm"
          >
            <div v-if="status === 'live'" class="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-light to-primary-container"></div>
            <div class="relative z-10">
              <div class="mb-md flex items-center gap-sm">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-light text-primary">
                  <span class="material-symbols-outlined">book</span>
                </div>
                <div class="min-w-0">
                  <h2 class="font-subtitle text-subtitle text-grey-900">{{ status === 'live' ? 'Lesson Material' : "Today's Scenario" }}</h2>
                  <p class="truncate font-caption text-caption text-secondary">{{ selectedTopic || 'English conversation practice' }}</p>
                </div>
              </div>

              <div class="max-h-[48dvh] overflow-y-auto rounded-lg border border-grey-100 bg-grey-50 p-md" style="overscroll-behavior: contain">
                <p class="whitespace-pre-line font-body-lg text-body-lg leading-relaxed text-on-surface" lang="en">{{ materialDisplayText }}</p>
              </div>

              <div class="mt-md flex flex-wrap items-center justify-between gap-sm">
                <button class="flex items-center gap-xs font-body-sm text-body-sm text-primary transition-colors hover:text-blue-hover" @click="playLastTts">
                  <span class="material-symbols-outlined text-[18px]">volume_up</span>
                  Listen
                </button>
                <div class="flex flex-wrap gap-xs">
                  <span class="rounded bg-grey-100 px-2 py-1 text-xs font-medium text-grey-600">Beginner</span>
                  <span class="rounded bg-grey-100 px-2 py-1 text-xs font-medium text-grey-600">Daily Life</span>
                </div>
              </div>
            </div>
          </article>

          <div v-else class="rounded-xl border border-grey-200 bg-background-layered p-lg text-center">
            <p class="font-body text-body text-secondary">강의 자료를 준비하려면 새 주제를 선택해 주세요.</p>
          </div>

          <div v-if="status === 'live'" class="flex flex-col items-center gap-sm" aria-live="polite" aria-atomic="true">
            <div class="flex items-center gap-sm text-primary">
              <span class="material-symbols-outlined pulse-subtle" style="font-variation-settings: 'FILL' 1">mic</span>
              <span class="font-subtitle text-subtitle">{{ statusDisplayText }}</span>
            </div>
            <div class="flex h-3 items-end gap-1" aria-hidden="true">
              <div class="pulse-subtle h-2 w-1 rounded-full bg-primary"></div>
              <div class="pulse-subtle h-3 w-1 rounded-full bg-primary" style="animation-delay: 150ms"></div>
              <div class="pulse-subtle h-1.5 w-1 rounded-full bg-primary" style="animation-delay: 300ms"></div>
              <div class="pulse-subtle h-2.5 w-1 rounded-full bg-primary" style="animation-delay: 450ms"></div>
            </div>
          </div>

          <transition name="hint-fade">
            <div
              v-if="status === 'live' && isFirstLiveHint"
              class="mx-auto w-full max-w-sm cursor-pointer rounded-xl border border-primary-fixed-dim bg-blue-light px-md py-sm text-center"
              role="status"
              aria-live="polite"
              tabindex="0"
              @click="dismissFirstLiveHint"
              @keydown.enter.prevent="dismissFirstLiveHint"
              @keydown.space.prevent="dismissFirstLiveHint"
            >
              <p class="font-body-sm text-body-sm font-semibold text-on-surface">가볍게 인사해 보세요.</p>
              <p class="mt-xs font-caption text-caption text-secondary">
                예: "Hi Jesica! I'm [이름]."
              </p>
            </div>
          </transition>
        </section>
      </template>
    </main>

    <ControlBar
      v-if="!(showInterestPopup && status === 'idle')"
      :call-active="isCallActive"
      @toggleCall="toggleCall"
      @toggleChat="toggleChat"
      @toggleMenu="toggleMenu"
    />

    <!-- Chat Panel -->
    <ChatPanel
      :open="isChatOpen"
      :log="mergedConversationLog"
      @close="toggleChat"
    />

    <!-- Settings Sheet -->
    <section
      class="fixed inset-x-0 bottom-0 z-[70] flex min-h-[55dvh] max-h-[70dvh] flex-col overflow-y-auto rounded-t-xl border-t border-grey-200 bg-background-layered p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl transition-transform duration-300 sm:p-5"
      :class="isSettingsOpen ? 'translate-y-0' : 'translate-y-[calc(100%+16px)]'"
      role="dialog"
      aria-modal="true"
      aria-label="설정"
    >
      <div class="flex items-center justify-between text-on-surface font-bold">
        <span>세션 설정</span>
        <button class="rounded-lg border border-grey-200 bg-background-layered px-3 py-1.5 text-xs font-bold text-on-surface transition-colors hover:bg-grey-100" @click="toggleMenu">닫기</button>
      </div>
      <div class="flex flex-wrap gap-2.5 mt-3">
        <button class="rounded-lg border border-grey-200 bg-background-layered px-3 py-1.5 text-xs font-bold text-on-surface transition-colors hover:bg-grey-100" @click="resetSession">새 세션 시작</button>
        <button class="rounded-lg border border-grey-200 bg-background-layered px-3 py-1.5 text-xs font-bold text-on-surface transition-colors hover:bg-grey-100" @click="playLastTts">마지막 TTS 재생</button>
        <button
          v-if="isDebugModeEnabled"
          class="rounded-lg border border-grey-200 bg-background-layered px-3 py-1.5 text-xs font-bold text-on-surface transition-colors hover:bg-grey-100"
          @click="openAdminPanel"
        >
          Admin Mode
        </button>
      </div>
      <div class="mt-4 bg-blue-light border border-grey-200 rounded-xl text-secondary text-xs leading-relaxed p-3">
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
  idle: "Idle",
  connecting: "Connecting",
  live: "Live",
  ended: "Idle",
  error: "Error",
  closed: "Closed",
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
    case "live":
    case "ended":
      return "bg-success";
    case "error":
    case "closed":
      return "bg-error";
    case "connecting":
      return "bg-warning";
    default:
      return "bg-grey-400";
  }
});

// ---- 연결 단계 텍스트 ----
const connectingStepText = computed(() => connectingStep.value || "연결 중...");

const statusDisplayText = computed(() => {
  if (isModelSpeaking.value) return "선생님이 말하는 중..";
  if (isUserSpeaking.value) return "선생님이 듣는 중..";
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
