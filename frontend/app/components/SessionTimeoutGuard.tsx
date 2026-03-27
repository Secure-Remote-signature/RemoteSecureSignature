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

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isLoggingOut = false;
    const timeoutMs = getTimeoutMs();

    const clearLocalSession = () => {
      sessionStorage.setItem("auth_notice", "Session หมดเวลาใช้งานอัตโนมัติ กรุณาเข้าสู่ระบบใหม่");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_session");
    };

    const triggerAutoLogout = async () => {
      if (isLoggingOut) return;
      isLoggingOut = true;

      const sessionRaw = sessionStorage.getItem("user_session");
      let userId: number | null = null;

      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw);
          userId = Number(parsed?.id);
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
      timerRef.current = setTimeout(() => {
        void triggerAutoLogout();
      }, timeoutMs);
    };

    const sessionRaw = sessionStorage.getItem("user_session");
    if (!sessionRaw) return;

    restartTimer();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, restartTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, restartTimer);
      });
    };
  }, [router]);

  return null;
}
