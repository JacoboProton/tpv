let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function playBeep(freq = 660, duration = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playKitchenAlert() {
  try {
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.12;
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.2);
    });
  } catch {}
}

export function showKitchenNotification(count) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('La Comanda — Cocina', {
      body: `${count} ${count === 1 ? 'línea pendiente' : 'líneas pendientes'} en cocina`,
      icon: '/icon-192.svg',
    });
  }
}

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
