<template>
  <div class="call-screen">
    <header class="top-bar">
      <span class="timer">{{ timer }}</span>
    </header>

    <span class="status-pill">
      <span class="status-dot" :class="{ live: status === 'live' }"></span>
      {{ status }}
    </span>

    <Avatar :speaking="speaking" />

    <ControlBar
      @hangup="endCall"
      @toggleChat="toggleChat"
      @toggleMenu="toggleMenu"
    />

    <ChatPanel :open="isChatOpen" :log="conversationLog" @close="toggleChat" />

    <section class="settings-sheet" :class="{ open: isSettingsOpen }">
      <div class="panel-header">
        <span>Session Settings</span>
        <button class="secondary-btn" @click="toggleMenu">Close</button>
      </div>
      <label class="field">
        Model ID
        <input
          v-model="modelId"
          placeholder="gemini-2.5-flash-native-audio-preview-12-2025"
        />
      </label>
      <div style="display: flex; gap: 12px; margin-top: 12px;">
        <button class="primary-btn" @click="startCall">Connect</button>
        <button class="secondary-btn" @click="resetSession">New session</button>
      </div>
      <div class="analysis-box" style="margin-top: 16px;">
        {{ analysis || "End the call to request analysis." }}
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from "vue";
import Avatar from "./Avatar.vue";
import ControlBar from "./ControlBar.vue";
import ChatPanel from "./ChatPanel.vue";
import { GeminiLiveSession } from "../services/geminiLive";

const timer = ref("00:00");
const seconds = ref(0);
let timerId = null;

const isChatOpen = ref(false);
const isSettingsOpen = ref(false);
const speaking = ref(false);
const status = ref("idle");

const modelId = ref(
  localStorage.getItem("talky:model_id") ||
    "gemini-2.5-flash-native-audio-preview-12-2025"
);
const apiBase =
  "https://ephemeral-token-service-399277644361.asia-northeast3.run.app";
const sessionId = ref(
  localStorage.getItem("talky:last_session_id") ||
    (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
);
const conversationLog = ref(loadLog(sessionId.value));
const analysis = ref("");

const session = new GeminiLiveSession({
  modelId: modelId.value,
  apiVersion: "v1alpha",
  onTranscript: (entry) => {
    conversationLog.value.push(entry);
    saveLog(sessionId.value, conversationLog.value);
  },
  onStatus: (state) => {
    if (state === "connected") status.value = "live";
    if (state === "closed") status.value = "closed";
  },
  onAudioStart: () => {
    speaking.value = true;
  },
  onAudioEnd: () => {
    speaking.value = false;
  },
});

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
  if (!modelId.value) {
    isSettingsOpen.value = true;
    return;
  }
  if (status.value === "live") return;
  status.value = "connecting";
  try {
    localStorage.setItem("talky:model_id", modelId.value);
    localStorage.setItem("talky:last_session_id", sessionId.value);
    const response = await fetch(`${apiBase}/api/ephemeral-token`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Token request failed");
    const data = await response.json();
    await session.connect({
      modelId: modelId.value,
      ephemeralToken: data.token,
    });
    await session.startMic();
    startTimer();
  } catch (err) {
    status.value = "error";
  }
}

async function endCall() {
  session.stop();
  stopTimer();
  status.value = "ended";
  speaking.value = false;
  await analyzeConversation();
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
  try {
    const response = await fetch("/api/analyze", {
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
