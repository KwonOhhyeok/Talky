import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Global mocks for browser APIs not available in jsdom
// ---------------------------------------------------------------------------

// Minimal AudioContext stub
class AudioContextStub {
  sampleRate = 48000;
  state = "running";
  destination = { maxChannelCount: 2 };
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createScriptProcessor() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null,
    };
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }
  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }
  async resume() {}
  async close() {}
  decodeAudioData = vi.fn().mockResolvedValue({});
}

globalThis.AudioContext = AudioContextStub;
globalThis.webkitAudioContext = AudioContextStub;

// AudioWorklet stub
class AudioWorkletNodeStub {
  port = { postMessage: vi.fn(), onmessage: null };
  connect = vi.fn();
  disconnect = vi.fn();
}
globalThis.AudioWorkletNode = AudioWorkletNodeStub;

// WebSocket stub
class WebSocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = WebSocketStub.CONNECTING;
  onopen = null;
  onclose = null;
  onmessage = null;
  onerror = null;
  send = vi.fn();
  close = vi.fn();
  constructor() {
    this.readyState = WebSocketStub.CONNECTING;
  }
}
globalThis.WebSocket = WebSocketStub;

// MediaStream / getUserMedia stubs
class MediaStreamStub {
  getTracks() {
    return [{ stop: vi.fn(), kind: "audio" }];
  }
  getAudioTracks() {
    return this.getTracks();
  }
}
globalThis.MediaStream = MediaStreamStub;

if (!globalThis.navigator.mediaDevices) {
  globalThis.navigator.mediaDevices = {};
}
globalThis.navigator.mediaDevices.getUserMedia = vi
  .fn()
  .mockResolvedValue(new MediaStreamStub());

// crypto.randomUUID stub
if (!globalThis.crypto) {
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    "00000000-0000-0000-0000-000000000000";
}

// import.meta.env stubs
// (Vite injects these; vitest handles them, but we ensure DEV is present)

// Clean up localStorage between tests
beforeEach(() => {
  localStorage.clear();
});
