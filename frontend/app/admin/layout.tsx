"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/globals.css";
import MainNavbar from "../components/MainNavbar";
import Slidebar from "../components/Slidebar";
import SessionTimeoutGuard from "../components/SessionTimeoutGuard";

type AuthStatus = {
  checking: boolean;
  isValid: boolean;
  isAdmin: boolean;
  shouldClear: boolean;
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    checking: true,
    isValid: false,
    isAdmin: false,
    shouldClear: false,
  });

  useEffect(() => {
    const session = sessionStorage.getItem("user_session");
    if (!session) {
      setAuthStatus({ checking: false, isValid: false, isAdmin: false, shouldClear: false });
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const role = String(parsed?.role ?? "").toLowerCase();
      const isValid = Boolean(parsed?.id);
      const isAdmin = role.includes("admin");
      setAuthStatus({ checking: false, isValid, isAdmin, shouldClear: false });
    } catch {
      setAuthStatus({ checking: false, isValid: false, isAdmin: false, shouldClear: true });
    }
  }, []);

  useEffect(() => {
    if (authStatus.checking) {
      return;
    }

    if (authStatus.shouldClear) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_session");
      router.replace("/login");
      return;
    }

    if (!authStatus.isValid) {
      router.replace("/login");
      return;
    }

    if (!authStatus.isAdmin) {
      sessionStorage.setItem("auth_notice", "คุณไม่มีสิทธิ์เข้าถึงหน้าแอดมิน");
      router.replace("/dashboard");
    }
  }, [authStatus, router]);

  if (authStatus.checking || !authStatus.isValid || !authStatus.isAdmin) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB] text-gray-500">
        กำลังตรวจสอบสิทธิ์แอดมิน...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F9FAFB]">
      <SessionTimeoutGuard />
      <header className="w-full bg-white relative z-30">
        <MainNavbar onMenuClick={() => setIsSidebarOpen(true)} />
      </header>

      <Slidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-auto relative">{children}</main>
    </div>
  );
}
