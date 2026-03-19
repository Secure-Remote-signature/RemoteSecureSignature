"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/globals.css";
import MainNavbar from "../components/MainNavbar";
import Slidebar from "../components/Slidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem("user_session");
    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      if (!parsed?.id) {
        throw new Error("invalid session");
      }
      setIsCheckingAuth(false);
    } catch {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_session");
      router.replace("/login");
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB] text-gray-500">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F9FAFB]">
      
      {/* ส่วนหัว (Header) */}
      <header className="w-full bg-white relative z-30">
        <MainNavbar onMenuClick={() => setIsSidebarOpen(true)} />
      </header>

      {/* แถบเมนู (Sidebar) */}
      <Slidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* เนื้อหาหลัก (Main Content) */}
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>

    </div>
  );
}