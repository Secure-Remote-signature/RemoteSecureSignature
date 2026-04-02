"use client";

import { useState } from "react";
import "@/app/styles/globals.css";
import MainNavbar from "../components/MainNavbar";
import Slidebar from "../components/Slidebar";
import SessionTimeoutGuard from "../components/SessionTimeoutGuard";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F9FAFB]">
      <SessionTimeoutGuard />
      
      {/* ส่วนหัว (Header) */}
      <header className="w-full bg-white relative z-30">
        <MainNavbar onMenuClick={() => setIsSidebarOpen(true)} userName="User" userLastName="Name" />
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