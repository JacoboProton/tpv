import { io } from 'socket.io-client';

let socket = null;
let listeners = [];

export function getSocket() {
  return socket?.connected ? socket : null;
}

export function connectSocket() {
  if (socket?.connected) return socket;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  socket = io(origin, { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    listeners.forEach(fn => fn(true));
  });

  socket.on('disconnect', () => {
    listeners.forEach(fn => fn(false));
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onSocketChange(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function emitFloorUpdate(floor) {
  const s = getSocket();
  if (!s?.connected) return;
  s.emit('floor:updated', floor);
}

export function joinRoom(room) {
  const s = getSocket();
  if (s?.connected) s.emit('join-room', room);
}

export function leaveRoom(room) {
  const s = getSocket();
  if (s?.connected) s.emit('leave-room', room);
}
