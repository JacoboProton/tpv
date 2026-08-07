import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'tpv:pin_lock';
const MAX_FAILURES = 4;
const LOCK_MS = 5 * 60 * 1000;

interface LockState {
  count: number;
  until: number;
}

export function nextLockState(prev: LockState, now: number): LockState {
  if (prev.until > now) return prev;
  const count = prev.count + 1;
  if (count >= MAX_FAILURES) {
    return { count: 0, until: now + LOCK_MS };
  }
  return { count, until: 0 };
}

export function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function usePinLockout() {
  const [lock, setLock] = useState<LockState>({ count: 0, until: 0 });
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw || !active) return;
        try {
          const st = JSON.parse(raw) as LockState;
          if (Number.isFinite(st.count) && Number.isFinite(st.until)) {
            setLock(st);
          }
        } catch {
          /* ignore corrupted state */
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lock.count > 0 || lock.until > 0) {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lock)).catch(() => {});
    } else {
      void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, [lock]);

  useEffect(() => {
    if (lock.until <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lock.until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lock.until]);

  const locked = lock.until > now;
  const remainingSeconds = locked ? Math.max(1, Math.ceil((lock.until - now) / 1000)) : 0;

  const registerFailure = useCallback(() => {
    setLock(prev => {
      const nowV = Date.now();
      return nextLockState(prev, nowV);
    });
  }, []);

  const reset = useCallback(() => {
    setLock({ count: 0, until: 0 });
  }, []);

  return {
    locked,
    remainingSeconds,
    remainingLabel: formatRemaining(remainingSeconds),
    registerFailure,
    reset,
  };
}