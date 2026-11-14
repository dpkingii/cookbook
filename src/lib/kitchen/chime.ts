let ctx: AudioContext | null = null;

/** Call from a tap handler once: browsers only allow audio after a user gesture. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
}

export function chime() {
  if (!ctx) return;
  const start = ctx.currentTime;
  [880, 1174.66, 1318.51].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const t = start + i * 0.18;
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
  navigator.vibrate?.([200, 100, 200]);
}
