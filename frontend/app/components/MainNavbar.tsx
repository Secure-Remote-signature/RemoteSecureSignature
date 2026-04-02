"use client";
import "@/app/styles/components.css";
import { Menu} from 'lucide-react';
import api from '@/app/lib/api';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


interface NavbarProps {
  userId: number;
  userName: string;
  userLastname: string;
}

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<NavbarProps | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      const savedData = sessionStorage.getItem("user_session");
      if (!savedData) return;

      try {
        const session = JSON.parse(savedData);
        const userId = session.id;
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/srs/user/profile/${userId}`;
        const response = await api.get(apiUrl);
        if(response.data.error) {
          router.push("/login");
          return;
        }
        // console.log()
        setUserProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile in Navbar:", error);
      }
    };

    fetchProfile();
  }, []);
  return (

    <nav className="h-full w-full flex items-center justify-between px-2 2xl:py-3 pi:py-1 relative z-30 shadow-md">
      
      {/* ฝั่งซ้าย: ปุ่มเมนู + โลโก้ */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onMenuClick}
          className="text-indigo-600 p-1 hover:bg-indigo-50 rounded-md transition-colors"
        >
          <Menu size={32} />
        </button>
        <span className="font-black pi:text-[24px] 2xl:text-[40px]  text-[#4F46E5] ">
          Secure Remote Signature
        </span>
      </div>

      {/* ฝั่งขวา: ชื่อผู้ใช้ + รูปโปรไฟล์ */}
      <div className="flex items-center gap-3">
        {/* ชื่อผู้ใช้ (ซ่อนในมือถือจอเล็กมากๆ ได้ถ้าต้องการ) */}
        <span className="text-Slate-gray pi:text-[18px] 2xl:text-[24px] font-bold hidden sm:inline-block mx-5">
          ยินดีต้อนรับ, คุณ{userProfile?.userName} {userProfile?.userLastname || ""}
        </span>
      </div>

    </nav>
  );
}