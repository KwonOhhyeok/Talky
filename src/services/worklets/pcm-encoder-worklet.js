class PCMEncoderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    const buffer = new ArrayBuffer(channel.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < channel.length; i += 1) {
      let sample = Math.max(-1, Math.min(1, channel[i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(i * 2, sample, true);
    }
    this.port.postMessage(buffer, [buffer]);
    return true;
  }
}

registerProcessor("pcm-encoder", PCMEncoderProcessor);
