export type TranscriptEntry = {
  speaker: string;
  text: string;
  ts: number;
};

export type GeminiLiveOptions = {
  apiVersion?: "v1alpha" | "v1beta";
  modelId?: string;
  model?: string;
  outputSampleRate?: number;
  debug?: boolean;
  onTranscript?: (entry: TranscriptEntry) => void;
  onStatus?: (status: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
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
  outputSampleRate: number;
  debug: boolean;
  audioChunkCount = 0;
  onTranscript?: (entry: TranscriptEntry) => void;
  onStatus?: (status: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;

  constructor(options: GeminiLiveOptions = {}) {
    this.modelId = options.modelId;
    this.apiVersion = options.apiVersion || "v1alpha";
    this.model =
      options.model || "gemini-2.5-flash-native-audio-preview-12-2025";
    this.outputSampleRate = options.outputSampleRate || 24000;
    this.debug = options.debug ?? true;
    this.onTranscript = options.onTranscript;
    this.onStatus = options.onStatus;
    this.onAudioStart = options.onAudioStart;
    this.onAudioEnd = options.onAudioEnd;
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
        this.sendConfig();
        this.onStatus?.("connected");
        resolve();
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
    const model = this.modelId || this.model;
    const payload = {
      setup: {
        model,
        generationConfig: {
          responseModalities: ["AUDIO"],
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
    if (this.audioChunkCount % 50 === 0) {
      this.log("audio:chunk-sent", {
        count: this.audioChunkCount,
        bytes: pcm16.byteLength,
      });
    }
    this.socket.send(pcm16);
  }

  handleMessage(event: MessageEvent) {
    if (typeof event.data !== "string") {
      this.log("ws:message-nonjson", { type: typeof event.data });
      return;
    }

    let msg: any = null;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      this.log("ws:message-parse-error", {
        preview: event.data.slice(0, 200),
      });
      return;
    }

    if (!msg) return;
    this.log("ws:message", { keys: Object.keys(msg) });

    if (msg.transcript || msg.text) {
      const text = msg.transcript || msg.text;
      const speakerRaw = msg.speaker || msg.role || "model";
      const speaker = String(speakerRaw).toLowerCase();
      this.log("transcript", { speaker, textPreview: String(text).slice(0, 120) });
      this.onTranscript?.({ speaker, text, ts: Date.now() });
    }

    const audioPayload = msg.audio || (msg.response && msg.response.audio);
    if (audioPayload) {
      const base64 = audioPayload.data || audioPayload;
      if (typeof base64 === "string") {
        this.playAudio(base64);
      }
    }
  }

  playAudio(base64: string) {
    if (!this.audioContext || !this.outputGain) return;
    const pcm16 = this.decodeBase64ToInt16(base64);
    const audioBuffer = this.audioContext.createBuffer(
      1,
      pcm16.length,
      this.outputSampleRate
    );
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i += 1) {
      channel[i] = pcm16[i] / 32768;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputGain);
    source.onended = () => this.onAudioEnd?.();
    this.onAudioStart?.();
    source.start();
  }

  decodeBase64ToInt16(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  stop() {
    this.log("session:stop");
    this.workletNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.socket?.close();
  }

  log(label: string, detail?: unknown) {
    if (!this.debug) return;
    if (detail === undefined) {
      console.log(`[GeminiLive] ${label}`);
      return;
    }
    console.log(`[GeminiLive] ${label}`, detail);
  }
}
