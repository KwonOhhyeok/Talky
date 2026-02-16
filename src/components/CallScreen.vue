<template>
  <div class="call-screen">
    <header class="top-bar">
      <span class="meta-chip timer-chip">{{ timer }}</span>
      <span class="brand">Talky Live</span>
      <span class="meta-chip status-chip">
        <span class="status-dot" :class="{ live: status === 'live' }"></span>
        {{ status }}
      </span>
    </header>
    <div v-if="status === 'connecting'" class="connecting-overlay" aria-live="polite">
      <div class="connecting-popup" role="status" aria-label="Connecting">
        <span class="connecting-title">Connecting...</span>
        <span class="connecting-hint">Please wait before speaking</span>
        <span class="connecting-dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
      </div>
    </div>
    <Avatar :speaking="isModelSpeaking" :listening="isUserSpeaking" />

    <ControlBar
      :call-active="isCallActive"
      @toggleCall="toggleCall"
      @toggleChat="toggleChat"
      @toggleMenu="toggleMenu"
    />

    <ChatPanel :open="isChatOpen" :log="conversationLog" @close="toggleChat" />

    <section class="settings-sheet" :class="{ open: isSettingsOpen }">
      <div class="panel-header">
        <span>Session Settings</span>
        <button class="secondary-btn" @click="toggleMenu">Close</button>
      </div>
      <div class="settings-actions">
        <button class="secondary-btn" @click="resetSession">New session</button>
        <button class="secondary-btn" @click="playLastTts">Play Last TTS</button>
      </div>
      <div class="analysis-box">
        {{ analysis || "End the call to request analysis." }}
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import Avatar from "./Avatar.vue";
import ControlBar from "./ControlBar.vue";
import ChatPanel from "./ChatPanel.vue";
import { GeminiLiveSession } from "../services/geminiLive";
import { SessionArchive } from "../services/sessionArchive";

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

const FIXED_MODEL_ID = "gemini-2.5-flash-native-audio-preview-12-2025";
const apiBase = import.meta.env.DEV
  ? ""
  : "https://ephemeral-token-service-399277644361.asia-northeast3.run.app";
const tokenApiUrl = `${apiBase}/api/ephemeral-token`;
const analysisApiUrl = "";
const sessionId = ref(
  localStorage.getItem("talky:last_session_id") ||
    (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
);
const conversationLog = ref(loadLog(sessionId.value));
const analysis = ref("");
const archiveReady = ref(false);

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
    conversationLog.value.push(entry);
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

async function startCall() {
  if (status.value === "live" || status.value === "connecting") return;
  const requestSeq = ++callRequestSeq;
  status.value = "connecting";
  try {
    localStorage.setItem("talky:last_session_id", sessionId.value);
    await archive.createSession(FIXED_MODEL_ID);
    if (requestSeq !== callRequestSeq) return;
    archiveReady.value = true;
    const response = await fetch(tokenApiUrl, {
      method: "POST",
    });
    if (requestSeq !== callRequestSeq) return;
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Token request failed (${response.status}): ${bodyText}`);
    }
    const data = await response.json();
    if (requestSeq !== callRequestSeq) return;
    await session.connect({
      modelId: FIXED_MODEL_ID,
      ephemeralToken: data.token,
    });
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    await session.startMic();
    if (requestSeq !== callRequestSeq) {
      session.stop();
      return;
    }
    status.value = "live";
    startTimer();
  } catch (err) {
    console.error("[CallScreen] startCall failed", err);
    if (requestSeq === callRequestSeq) {
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
  sessionId.value =
    crypto.randomUUID?.() || `session-${Date.now().toString(36)}`;
  saveLog(sessionId.value, conversationLog.value);
  archiveReady.value = false;
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
</script>
