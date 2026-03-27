"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";

const DEFAULT_TIMEOUT_MINUTES = 15;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

function getTimeoutMs() {
  const raw = Number(process.env.NEXT_PUBLIC_AUTO_LOGOUT_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
  }
  return raw * 60 * 1000;
}

export default function SessionTimeoutGuard() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isLoggingOut = false;
    const timeoutMs = getTimeoutMs();

    const clearLocalSession = () => {
      sessionStorage.setItem("auth_notice", "Session หมดเวลาใช้งานอัตโนมัติ กรุณาเข้าสู่ระบบใหม่");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_session");
    };

    const getCurrentUserId = () => {
      const sessionRaw = sessionStorage.getItem("user_session");
      if (!sessionRaw) return null;

      try {
        const parsed = JSON.parse(sessionRaw);
        const userId = Number(parsed?.id ?? parsed?.userId);
        if (!Number.isInteger(userId) || userId <= 0) return null;
        return userId;
      } catch {
        return null;
      }
    };

    const sendHeartbeat = async () => {
      const userId = getCurrentUserId();
      if (!userId || isLoggingOut) return;

      try {
        await api.post(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/heartbeat`, { userId });
        lastHeartbeatAtRef.current = Date.now();
      } catch {
        // Best-effort keepalive only.
      }
    };

    const triggerAutoLogout = async () => {
      if (isLoggingOut) return;
      isLoggingOut = true;

      const sessionRaw = sessionStorage.getItem("user_session");
      let userId: number | null = null;

      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw);
          userId = Number(parsed?.id ?? parsed?.userId);
        } catch {
          userId = null;
        }
      }

      if (Number.isInteger(userId) && userId && userId > 0) {
        try {
          await api.post(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/logout`, { userId });
        } catch {
          // Best-effort status update only.
        }
      }

      clearLocalSession();
      router.replace("/login");
    };

    const restartTimer = () => {
      if (isLoggingOut) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const now = Date.now();
      if (now - lastHeartbeatAtRef.current >= 45000) {
        void sendHeartbeat();
      }

      timerRef.current = setTimeout(() => {
        void triggerAutoLogout();
      }, timeoutMs);
    };

    const sessionRaw = sessionStorage.getItem("user_session");
    if (!sessionRaw) return;

    void sendHeartbeat();
    restartTimer();
    heartbeatIntervalRef.current = setInterval(() => {
      void sendHeartbeat();
    }, 60000);

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, restartTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, restartTimer);
      });
    };
  }, [router]);

  return null;
}
