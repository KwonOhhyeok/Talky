type SessionCreateResponse = {
  sessionId: string;
  bucket: string;
  prefix: string;
  manifestPath: string;
  manifestUploadUrl: string;
  manifestReadUrl: string;
  uploadUrlEndpoint: string;
  readUrlEndpoint: string;
  createdAt: string;
};

type ArchiveOptions = {
  apiBase: string;
  onError?: (err: unknown) => void;
};

type StoredTranscript = {
  seq: number;
  path: string;
  speaker: string;
  text: string;
  ts: number;
};

type StoredAudio = {
  seq: number;
  path: string;
  mimeType: string;
  sampleRate: number;
  ts: number;
  bytes: number;
};

const LOCAL_ARCHIVE_KEY = "talky:last_archive_manifest";

export class SessionArchive {
  apiBase: string;
  onError?: (err: unknown) => void;
  session: SessionCreateResponse | null = null;
  transcriptSeq = 0;
  audioSeq = 0;
  transcripts: StoredTranscript[] = [];
  audioChunks: StoredAudio[] = [];
  uploadQueue: Promise<void> = Promise.resolve();
  lastManifest: any = null;

  constructor(options: ArchiveOptions) {
    this.apiBase = options.apiBase;
    this.onError = options.onError;
  }

  async createSession(modelId: string) {
    const response = await fetch(this.url("/api/session/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`session/create failed (${response.status}): ${text}`);
    }
    this.session = await response.json();
    this.transcriptSeq = 0;
    this.audioSeq = 0;
    this.transcripts = [];
    this.audioChunks = [];
    this.lastManifest = null;
    return this.session;
  }

  ingestTranscript(entry: { speaker: string; text: string; ts: number }) {
    const session = this.session;
    if (!session) return;
    const seq = ++this.transcriptSeq;
    const path = `${session.prefix}/transcript/${this.pad(seq)}.json`;
    const payload = {
      seq,
      speaker: entry.speaker,
      text: entry.text,
      ts: entry.ts,
    };
    this.transcripts.push({
      seq,
      path,
      speaker: entry.speaker,
      text: entry.text,
      ts: entry.ts,
    });
    const body = JSON.stringify(payload);
    this.enqueue(async () => {
      await this.putObject(session, path, "application/json", body);
    });
  }

  ingestModelAudio(chunk: { base64: string; mimeType: string; ts: number }) {
    const session = this.session;
    if (!session) return;
    const seq = ++this.audioSeq;
    const bytes = this.base64ToBytes(chunk.base64);
    const sampleRate = this.parseRate(chunk.mimeType) || 24000;
    const path = `${session.prefix}/model-audio/${this.pad(seq)}.pcm`;
    this.audioChunks.push({
      seq,
      path,
      mimeType: chunk.mimeType,
      sampleRate,
      ts: chunk.ts,
      bytes: bytes.byteLength,
    });
    this.enqueue(async () => {
      await this.putObject(session, path, "audio/pcm", bytes);
    });
  }

  async finalize(modelId: string) {
    const session = this.session;
    if (!session) return null;
    const queueAtFinalize = this.uploadQueue;
    const audioChunks = [...this.audioChunks];
    const transcripts = [...this.transcripts];
    await queueAtFinalize;
    const endedAt = new Date().toISOString();
    const manifest = {
      version: 1,
      sessionId: session.sessionId,
      bucket: session.bucket,
      prefix: session.prefix,
      modelId,
      createdAt: session.createdAt,
      endedAt,
      audioChunks: audioChunks.sort((a, b) => a.seq - b.seq),
      transcripts: transcripts.sort((a, b) => a.seq - b.seq),
      stats: {
        audioChunkCount: audioChunks.length,
        transcriptCount: transcripts.length,
      },
    };

    const response = await fetch(session.manifestUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manifest),
    });
    if (!response.ok) {
      throw new Error(`manifest upload failed (${response.status})`);
    }

    this.lastManifest = manifest;
    localStorage.setItem(
      LOCAL_ARCHIVE_KEY,
      JSON.stringify({
        manifestPath: session.manifestPath,
        sessionId: session.sessionId,
        readUrlEndpoint: session.readUrlEndpoint,
        apiBase: this.apiBase,
      })
    );
    return manifest;
  }

  async playLastModelAudio() {
    const manifest = await this.loadManifest();
    if (!manifest || !Array.isArray(manifest.audioChunks) || !manifest.audioChunks.length) {
      return false;
    }

    const chunks = [...manifest.audioChunks].sort((a, b) => a.seq - b.seq);
    const buffers: Int16Array[] = [];
    let totalSamples = 0;
    const sampleRate = chunks[0].sampleRate || this.parseRate(chunks[0].mimeType) || 24000;

    for (const chunk of chunks) {
      const readUrl = await this.fetchReadUrl(chunk.path);
      const response = await fetch(readUrl);
      if (!response.ok) {
        throw new Error(`chunk read failed (${response.status})`);
      }
      const raw = new Uint8Array(await response.arrayBuffer());
      const pcm16 = new Int16Array(
        raw.buffer,
        raw.byteOffset,
        Math.floor(raw.byteLength / 2)
      );
      buffers.push(pcm16);
      totalSamples += pcm16.length;
    }

    const merged = new Int16Array(totalSamples);
    let offset = 0;
    for (const chunk of buffers) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const audioContext = new AudioContext();
    const audioBuffer = audioContext.createBuffer(1, merged.length, sampleRate);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < merged.length; i += 1) {
      channel[i] = merged[i] / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    return true;
  }

  async loadManifest() {
    if (this.lastManifest) return this.lastManifest;
    if (this.session) {
      const response = await fetch(this.session.manifestReadUrl);
      if (response.ok) {
        this.lastManifest = await response.json();
        return this.lastManifest;
      }
    }

    const raw = localStorage.getItem(LOCAL_ARCHIVE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    const readUrlEndpoint = stored.readUrlEndpoint;
    const apiBase = stored.apiBase ?? this.apiBase;
    const response = await fetch(`${apiBase}${readUrlEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: stored.manifestPath }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const manifestRes = await fetch(payload.url);
    if (!manifestRes.ok) return null;
    this.lastManifest = await manifestRes.json();
    return this.lastManifest;
  }

  enqueue(task: () => Promise<void>) {
    this.uploadQueue = this.uploadQueue
      .then(task)
      .catch((err) => {
        this.onError?.(err);
      });
  }

  async putObject(
    session: SessionCreateResponse,
    path: string,
    contentType: string,
    body: BodyInit
  ) {
    const uploadUrl = await this.fetchUploadUrl(session, path, contentType);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    if (!response.ok) {
      throw new Error(`GCS upload failed (${response.status}) path=${path}`);
    }
  }

  async fetchUploadUrl(
    session: SessionCreateResponse,
    path: string,
    contentType: string
  ) {
    const response = await fetch(this.url(session.uploadUrlEndpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, contentType }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`upload-url failed (${response.status}): ${text}`);
    }
    const payload = await response.json();
    return payload.url as string;
  }

  async fetchReadUrl(path: string) {
    if (!this.session) {
      throw new Error("Archive session is not initialized");
    }
    const response = await fetch(this.url(this.session.readUrlEndpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`read-url failed (${response.status}): ${text}`);
    }
    const payload = await response.json();
    return payload.url as string;
  }

  url(path: string) {
    if (!this.apiBase) return path;
    return `${this.apiBase}${path}`;
  }

  pad(seq: number) {
    return String(seq).padStart(6, "0");
  }

  parseRate(mimeType: string) {
    const match = mimeType.match(/rate=(\d+)/i);
    if (!match) return undefined;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value;
  }

  base64ToBytes(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
