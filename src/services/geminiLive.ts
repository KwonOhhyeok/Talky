import { DEFAULT_SYSTEM_INSTRUCTION } from "../config/systemPrompt";

export type TranscriptEntry = {
  speaker: string;
  text: string;
  ts: number;
};

export type GeminiLiveOptions = {
  apiVersion?: "v1alpha" | "v1beta";
  modelId?: string;
  model?: string;
  systemInstruction?: string;
  outputSampleRate?: number;
  debug?: boolean;
  onTranscript?: (entry: TranscriptEntry) => void;
  onModelAudioChunk?: (chunk: {
    base64: string;
    mimeType: string;
    ts: number;
  }) => void;
  onStatus?: (status: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onUserSpeechStart?: () => void;
  onUserSpeechEnd?: () => void;
};

export class GeminiLiveSession {
  socket: WebSocket | null = null;
  audioContext: AudioContext | null = null;
  workletNode: AudioWorkletNode | null = null;
  mediaStream: MediaStream | null = null;
  outputGain: GainNode | null = null;
  muted = false;
  apiVersion: "v1alpha" | "v1beta";
  modelId?: string;
  model: string;
  systemInstruction: string;
  outputSampleRate: number;
  inputSampleRate = 16000;
  debug: boolean;
  audioChunkCount = 0;
  audioPacketCount = 0;
  pendingAudioChunks: Uint8Array[] = [];
  pendingAudioBytes = 0;
  readonly minAudioPacketBytes = 2048;
  nextPlaybackTime = 0;
  activeOutputSources = 0;
  outputSources = new Set<AudioBufferSourceNode>();
  readonly playbackLeadSeconds = 0.12;
  readonly playbackStatsEveryChunks = 40;
  readonly declickFadeSamples = 8;
  readonly boundaryBlendSamples = 24;
  playbackChunkCount = 0;
  playbackUnderrunCount = 0;
  playbackTinyChunkCount = 0;
  modelAudioChunkCount = 0;
  modelAudioTotalBytes = 0;
  pendingFadeIn = true;
  hasLastOutputSample = false;
  lastOutputSample = 0;
  lastPlaybackSampleRate: number | null = null;
  onTranscript?: (entry: TranscriptEntry) => void;
  onModelAudioChunk?: (chunk: {
    base64: string;
    mimeType: string;
    ts: number;
  }) => void;
  onStatus?: (status: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onUserSpeechStart?: () => void;
  onUserSpeechEnd?: () => void;
  userSpeaking = false;
  userSpeechIdleTimer: number | null = null;

  constructor(options: GeminiLiveOptions = {}) {
    this.modelId = options.modelId;
    this.apiVersion = options.apiVersion || "v1alpha";
    this.model =
      options.model || "gemini-2.5-flash-native-audio-preview-12-2025";
    this.systemInstruction =
      options.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
    this.outputSampleRate = options.outputSampleRate || 24000;
    this.debug = options.debug ?? true;
    this.onTranscript = options.onTranscript;
    this.onModelAudioChunk = options.onModelAudioChunk;
    this.onStatus = options.onStatus;
    this.onAudioStart = options.onAudioStart;
    this.onAudioEnd = options.onAudioEnd;
    this.onUserSpeechStart = options.onUserSpeechStart;
    this.onUserSpeechEnd = options.onUserSpeechEnd;
  }

  async connect({ modelId, ephemeralToken }: {
    modelId?: string;
    ephemeralToken: string;
  }) {
    this.modelId = modelId ?? this.modelId;
    if (!this.modelId) {
      throw new Error("Missing model id");
    }
    if (!ephemeralToken) {
      throw new Error("Missing ephemeral token");
    }

    const endpoint =
      this.apiVersion === "v1alpha"
        ? "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained"
        : "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
    const url = `${endpoint}?access_token=${encodeURIComponent(ephemeralToken)}`;
    this.log("connect:start", {
      apiVersion: this.apiVersion,
      endpoint,
      modelId: this.modelId,
      tokenPrefix: ephemeralToken.slice(0, 16),
    });

    this.socket = new WebSocket(url);
    this.socket.binaryType = "arraybuffer";

    return new Promise<void>((resolve, reject) => {
      if (!this.socket) return;
      this.socket.onopen = () => {
        this.log("ws:open");
        try {
          this.sendConfig();
          this.onStatus?.("connected");
          resolve();
        } catch (err) {
          this.log("ws:setup-error", err);
          this.onStatus?.("error");
          this.socket?.close();
          reject(err);
        }
      };
      this.socket.onerror = (err) => {
        this.log("ws:error", err);
        this.onStatus?.("error");
        reject(err);
      };
      this.socket.onclose = (event) => {
        this.log("ws:close", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        this.onStatus?.("closed");
      };
      this.socket.onmessage = (event) => this.handleMessage(event);
    });
  }

  async startMic() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.outputGain = this.audioContext.createGain();
      this.outputGain.gain.value = 1;
      this.outputGain.connect(this.audioContext.destination);
      this.inputSampleRate = this.audioContext.sampleRate;
      this.log("audio:context-created", {
        sampleRate: this.audioContext.sampleRate,
      });
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    this.log("audio:mic-granted");

    const workletUrl = new URL(
      "./worklets/pcm-encoder-worklet.js",
      import.meta.url
    );
    await this.audioContext.audioWorklet.addModule(workletUrl);
    this.log("audio:worklet-loaded");

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const workletNode = new AudioWorkletNode(this.audioContext, "pcm-encoder");
    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;

    workletNode.port.onmessage = (event) => {
      this.sendAudioChunk(event.data);
    };

    source.connect(workletNode);
    workletNode.connect(muteGain).connect(this.audioContext.destination);
    this.workletNode = workletNode;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  sendConfig() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const model = this.normalizeModel(this.modelId || this.model);
    const payload = {
      setup: {
        model,
        systemInstruction: {
          parts: [{ text: this.systemInstruction }],
        },
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            prefixPaddingMs: 40,
            silenceDurationMs: 220,
          },
          activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
        },
      },
    };
    this.log("ws:send-setup", payload);
    this.socket.send(JSON.stringify(payload));
  }

  sendAudioChunk(pcm16: ArrayBuffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (this.muted) return;
    this.audioChunkCount += 1;
    if (this.audioChunkCount % 500 === 0) {
      this.log("audio:chunk-sent", {
        count: this.audioChunkCount,
        bytes: pcm16.byteLength,
      });
    }

    const bytes = new Uint8Array(pcm16);
    this.pendingAudioChunks.push(bytes);
    this.pendingAudioBytes += bytes.byteLength;
    if (this.pendingAudioBytes < this.minAudioPacketBytes) return;
    this.flushPendingAudio();
  }

  handleMessage(event: MessageEvent) {
    if (typeof event.data === "string") {
      this.handleJsonMessage(event.data);
      return;
    }
    if (event.data instanceof Blob) {
      event.data
        .text()
        .then((text) => this.handleJsonMessage(text))
        .catch(() => this.log("ws:message-blob-read-error"));
      return;
    }
    if (event.data instanceof ArrayBuffer) {
      this.handleArrayBufferMessage(event.data);
      return;
    }
    this.log("ws:message-nonjson", {
      type: typeof event.data,
      constructor: event.data?.constructor?.name,
    });
  }

  handleArrayBufferMessage(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    const trimmed = decoded.trim();
    if (trimmed.startsWith("{")) {
      this.handleJsonMessage(trimmed);
      return;
    }

    if (bytes.byteLength >= 2 && bytes.byteLength % 2 === 0) {
      this.log("ws:message-binary-audio", { bytes: bytes.byteLength });
      this.recordModelAudioChunk(bytes.byteLength, this.outputSampleRate, "binary");
      this.onModelAudioChunk?.({
        base64: this.base64FromBytes(bytes),
        mimeType: `audio/pcm;rate=${this.outputSampleRate}`,
        ts: Date.now(),
      });
      this.playAudioFromBytes(bytes);
      return;
    }

    this.log("ws:message-binary-unknown", {
      bytes: bytes.byteLength,
      previewHex: Array.from(bytes.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    });
  }

  handleJsonMessage(raw: string) {
    let msg: any = null;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      this.log("ws:message-parse-error", {
        preview: raw.slice(0, 200),
      });
      return;
    }

    if (!msg) return;
    this.log("ws:message", { keys: Object.keys(msg) });

    const serverContent = msg.serverContent || msg.server_content;
    const inputTranscription =
      serverContent?.inputTranscription || serverContent?.input_transcription;
    const outputTranscription =
      serverContent?.outputTranscription || serverContent?.output_transcription;
    const modelTurn = serverContent?.modelTurn || serverContent?.model_turn;
    const activityStart =
      serverContent?.activityStart ||
      serverContent?.activity_start ||
      serverContent?.inputActivityStart ||
      serverContent?.input_activity_start;
    const activityEnd =
      serverContent?.activityEnd ||
      serverContent?.activity_end ||
      serverContent?.inputActivityEnd ||
      serverContent?.input_activity_end;

    if (serverContent?.interrupted === true) {
      this.clearPlaybackQueue("server-interrupted");
    }
    if (activityStart) {
      this.setUserSpeaking(true, "server-activity-start");
    }
    if (activityEnd) {
      this.setUserSpeaking(false, "server-activity-end");
    }

    const topInputTx = msg.inputTranscription || msg.input_transcription;
    const topOutputTx = msg.outputTranscription || msg.output_transcription;
    const inputTx = inputTranscription?.text || topInputTx?.text;
    if (inputTx) {
      this.setUserSpeaking(true, "input-transcription");
      this.refreshUserSpeechIdleTimer();
      this.log("transcript", { speaker: "user", textPreview: String(inputTx).slice(0, 120) });
      this.onTranscript?.({ speaker: "user", text: inputTx, ts: Date.now() });
    }

    const outputTx = outputTranscription?.text || topOutputTx?.text;
    if (outputTx) {
      this.log("transcript", { speaker: "model", textPreview: String(outputTx).slice(0, 120) });
      this.onTranscript?.({ speaker: "model", text: outputTx, ts: Date.now() });
    }

    const parts = modelTurn?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const inlineData = part?.inlineData || part?.inline_data;
        const base64 = inlineData?.data;
        const mimeType = inlineData?.mimeType || inlineData?.mime_type || "";
        if (typeof base64 === "string" && mimeType.startsWith("audio/pcm")) {
          const sampleRate =
            this.parseRateFromMimeType(mimeType) || this.outputSampleRate;
          this.recordModelAudioChunk(
            this.estimateBase64ByteLength(base64),
            sampleRate,
            "json"
          );
          this.onModelAudioChunk?.({
            base64,
            mimeType,
            ts: Date.now(),
          });
          this.playAudio(base64, sampleRate);
        }
        if (typeof part?.text === "string" && part.text.trim()) {
          this.onTranscript?.({
            speaker: "model",
            text: part.text,
            ts: Date.now(),
          });
        }
      }
    }
  }

  playAudio(base64: string, sampleRate?: number) {
    if (!this.audioContext || !this.outputGain) return;
    const pcm16 = this.decodeBase64ToInt16(base64);
    this.playPcm16(pcm16, sampleRate || this.outputSampleRate);
  }

  playAudioFromBytes(bytes: Uint8Array, sampleRate?: number) {
    if (bytes.byteLength % 2 !== 0) {
      this.log("audio:model-invalid-pcm-bytes", { bytes: bytes.byteLength });
    }
    const pcm16 = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2)
    );
    this.playPcm16(pcm16, sampleRate || this.outputSampleRate);
  }

  playPcm16(pcm16: Int16Array, sampleRate: number) {
    if (!this.audioContext || !this.outputGain) return;
    if (pcm16.length === 0) return;
    if (this.lastPlaybackSampleRate !== sampleRate) {
      this.lastPlaybackSampleRate = sampleRate;
      this.pendingFadeIn = true;
      this.hasLastOutputSample = false;
      this.log("audio:playback-rate", {
        sampleRate,
        contextSampleRate: this.audioContext.sampleRate,
      });
    }

    const audioBuffer = this.audioContext.createBuffer(
      1,
      pcm16.length,
      sampleRate
    );
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i += 1) {
      channel[i] = pcm16[i] / 32768;
    }
    this.applyBoundarySmoothing(channel, this.pendingFadeIn);
    this.pendingFadeIn = false;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputGain);
    this.outputSources.add(source);
    if (this.activeOutputSources === 0) {
      this.setUserSpeaking(false, "model-audio-start");
      this.onAudioStart?.();
    }
    this.activeOutputSources += 1;
    source.onended = () => {
      this.outputSources.delete(source);
      this.activeOutputSources -= 1;
      if (this.activeOutputSources <= 0) {
        this.activeOutputSources = 0;
        this.onAudioEnd?.();
      }
    };

    const now = this.audioContext.currentTime;
    let startAt = this.nextPlaybackTime;
    const minStartAt = now + this.playbackLeadSeconds;
    if (startAt < minStartAt) {
      if (startAt > 0 && startAt < now) {
        this.playbackUnderrunCount += 1;
        this.pendingFadeIn = true;
        this.hasLastOutputSample = false;
        this.log("audio:playback-underrun", {
          count: this.playbackUnderrunCount,
          lagMs: this.toFixed((now - startAt) * 1000, 2),
        });
      }
      startAt = minStartAt;
      this.pendingFadeIn = true;
    }

    source.start(startAt);
    this.nextPlaybackTime = startAt + audioBuffer.duration;

    this.playbackChunkCount += 1;
    const chunkMs = audioBuffer.duration * 1000;
    if (chunkMs < 12) {
      this.playbackTinyChunkCount += 1;
      this.log("audio:playback-tiny-chunk", {
        samples: pcm16.length,
        sampleRate,
        chunkMs: this.toFixed(chunkMs, 2),
      });
    }
    if (this.playbackChunkCount % this.playbackStatsEveryChunks === 0) {
      this.log("audio:playback-stats", {
        chunks: this.playbackChunkCount,
        activeSources: this.activeOutputSources,
        queueDepthMs: this.toFixed(
          Math.max(0, (this.nextPlaybackTime - now) * 1000),
          1
        ),
        lastChunkMs: this.toFixed(chunkMs, 2),
        underruns: this.playbackUnderrunCount,
        tinyChunks: this.playbackTinyChunkCount,
      });
    }
  }

  decodeBase64ToInt16(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    if (bytes.byteLength % 2 !== 0) {
      this.log("audio:model-invalid-pcm-bytes", { bytes: bytes.byteLength });
    }
    return new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
  }

  base64FromBytes(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  parseRateFromMimeType(mimeType: string) {
    const match = mimeType.match(/rate=(\d+)/i);
    if (!match) return undefined;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value;
  }

  applyBoundarySmoothing(channel: Float32Array, fadeIn: boolean) {
    const fadeSamples = Math.min(this.declickFadeSamples, channel.length);
    if (fadeIn) {
      for (let i = 0; i < fadeSamples; i += 1) {
        channel[i] *= i / fadeSamples;
      }
    } else if (this.hasLastOutputSample) {
      const blendSamples = Math.min(this.boundaryBlendSamples, channel.length);
      for (let i = 0; i < blendSamples; i += 1) {
        const t = (i + 1) / (blendSamples + 1);
        channel[i] =
          this.lastOutputSample + (channel[i] - this.lastOutputSample) * t;
      }
    }
    this.lastOutputSample = channel[channel.length - 1];
    this.hasLastOutputSample = true;
  }

  recordModelAudioChunk(
    bytes: number,
    sampleRate: number,
    transport: "json" | "binary"
  ) {
    this.modelAudioChunkCount += 1;
    this.modelAudioTotalBytes += bytes;
    const chunkMs = ((bytes / 2) * 1000) / sampleRate;
    if (chunkMs < 12) {
      this.log("audio:model-tiny-chunk", {
        transport,
        bytes,
        sampleRate,
        chunkMs: this.toFixed(chunkMs, 2),
      });
    }
    if (this.modelAudioChunkCount % this.playbackStatsEveryChunks === 0) {
      this.log("audio:model-stream-stats", {
        transport,
        chunks: this.modelAudioChunkCount,
        avgBytes: Math.round(this.modelAudioTotalBytes / this.modelAudioChunkCount),
        lastBytes: bytes,
        sampleRate,
        chunkMs: this.toFixed(chunkMs, 2),
      });
    }
  }

  estimateBase64ByteLength(base64: string) {
    const len = base64.length;
    if (!len) return 0;
    let padding = 0;
    if (base64.endsWith("==")) padding = 2;
    else if (base64.endsWith("=")) padding = 1;
    return Math.max(0, Math.floor((len * 3) / 4) - padding);
  }

  toFixed(value: number, digits: number) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  flushPendingAudio() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (!this.pendingAudioBytes) return;
    const merged = new Uint8Array(this.pendingAudioBytes);
    let offset = 0;
    for (const chunk of this.pendingAudioChunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    this.pendingAudioChunks = [];
    this.pendingAudioBytes = 0;

    const message = {
      realtimeInput: {
        audio: {
          data: this.base64FromBytes(merged),
          mimeType: `audio/pcm;rate=${this.inputSampleRate}`,
        },
      },
    };
    this.audioPacketCount += 1;
    if (this.audioPacketCount % 20 === 0) {
      this.log("audio:packet-sent", {
        packets: this.audioPacketCount,
        bytes: merged.byteLength,
      });
    }
    this.socket.send(JSON.stringify(message));
  }

  clearPlaybackQueue(reason: string) {
    this.log("audio:queue-clear", {
      reason,
      queuedSources: this.outputSources.size,
    });
    for (const source of Array.from(this.outputSources)) {
      source.onended = null;
      try {
        source.stop(0);
      } catch {
        // Already stopped.
      }
    }
    this.outputSources.clear();
    if (this.activeOutputSources > 0) {
      this.activeOutputSources = 0;
      this.onAudioEnd?.();
    }
    if (this.audioContext) {
      this.nextPlaybackTime = this.audioContext.currentTime;
    } else {
      this.nextPlaybackTime = 0;
    }
    this.pendingFadeIn = true;
    this.hasLastOutputSample = false;
  }

  stop() {
    this.log("session:stop");
    this.flushPendingAudio();
    this.clearPlaybackQueue("session-stop");
    this.workletNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.socket?.close();
    this.setUserSpeaking(false, "session-stop");
    this.clearUserSpeechIdleTimer();
  }

  setUserSpeaking(next: boolean, reason: string) {
    if (this.userSpeaking === next) return;
    this.userSpeaking = next;
    this.log("user:speaking", { value: next, reason });
    if (next) {
      this.onUserSpeechStart?.();
      return;
    }
    this.onUserSpeechEnd?.();
  }

  refreshUserSpeechIdleTimer() {
    this.clearUserSpeechIdleTimer();
    this.userSpeechIdleTimer = window.setTimeout(() => {
      this.setUserSpeaking(false, "input-idle-timeout");
    }, 700);
  }

  clearUserSpeechIdleTimer() {
    if (this.userSpeechIdleTimer === null) return;
    window.clearTimeout(this.userSpeechIdleTimer);
    this.userSpeechIdleTimer = null;
  }

  log(label: string, detail?: unknown) {
    if (!this.debug) return;
    if (detail === undefined) {
      console.log(`[GeminiLive] ${label}`);
      return;
    }
    console.log(`[GeminiLive] ${label}`, detail);
  }

  normalizeModel(rawModel: string) {
    const model = rawModel.trim();
    if (!model) throw new Error("Missing model id");
    if (model.startsWith("projects/")) {
      throw new Error(
        "Project-scoped model paths are not supported with ephemeral token auth. Use a public Gemini model id."
      );
    }
    if (model.startsWith("models/")) {
      return model;
    }
    return `models/${model}`;
  }
}
