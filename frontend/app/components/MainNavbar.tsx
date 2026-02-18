"use client";
import React from 'react';
import "@/app/styles/components.css";
import { Menu, User } from 'lucide-react'; // อย่าลืม npm install lucide-react นะครับ

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <nav className="h-full w-full flex items-center justify-between px-2 border-y-5 shadow-sm relative z-30">
      
      {/* ฝั่งซ้าย: ปุ่มเมนู + โลโก้ */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onMenuClick}
          className="text-indigo-600 p-1 hover:bg-indigo-50 rounded-md transition-colors"
        >
          <Menu size={32} />
        </button>
        <span className="pi:text-[24px] 2xl:text-[32px] font-bold text-indigo-600">
          Secure Remote Sign
        </span>
      </div>

      {/* ฝั่งขวา: ชื่อผู้ใช้ + รูปโปรไฟล์ */}
      <div className="flex items-center gap-3">
        {/* ชื่อผู้ใช้ (ซ่อนในมือถือจอเล็กมากๆ ได้ถ้าต้องการ) */}
        <span className="text-Slate-gray pi:text-[18px] 2xl:text-[24px] font-bold hidden sm:inline-block">
          ยินดีต้อนรับ, คุณสมชาย อาจหาญ
        </span>
        
        {/* ไอคอนโปรไฟล์ (วงกลมสีน้ำเงิน) */}
        <div className="bg-indigo-600 rounded-full p-1.5">
          <User size={24} className="text-white" />
        </div>
      </div>

    </nav>
  );
}