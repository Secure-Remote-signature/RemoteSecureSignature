'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import "@/app/styles/components.css";
import { useRouter } from 'next/navigation';

export default function ForgotPass() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // จำลองการส่งข้อมูลไป API (รอ 1.5 วินาที)
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  // สไตล์ของ Input เดิมของคุณ
  const inputStyle = `
    w-full
    text-Slate-gray 
    mt-3 
    ring-1 ring-[#C3C5CB] 
    py-2
    pi:text-[16px] 2xl:text-[24px] 
    pi:rounded-[30px] 2xl:rounded-[50px] 
    pi:px-4 2xl:px-6 
    pi:mb-5 2xl:mb-5 
    outline-none 
    focus:ring-2 focus:ring-[#4F46E5] 
    transition-all
  `;

  // สไตล์ของปุ่มหลักเดิมของคุณ
  const primaryBtnStyle = `
    bg-[#4338CA] 
    mt-2
    text-[#F9FAFB] font-semibold 
    rounded-[30px] 
    p-3
    px-5
    hover:opacity-90 hover:shadow-lg transition-all
    pi:text-[16px] 2xl:text-[20px]
    flex items-center justify-center gap-2
    disabled:opacity-70 disabled:cursor-not-allowed
  `;

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>

      {/* Card Section */}
      <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md p-8 pi:p-6 flex flex-col items-center">
        
        {/* เช็คสถานะ: ถ้ายังไม่สำเร็จ ให้โชว์ฟอร์มกรอกอีเมล */}
        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
            <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-1">
              ลืมรหัสผ่าน
            </h1>
            <p className="text-gray-500 text-sm pi:text-xs 2xl:text-base mb-4 text-center">
              กรอกอีเมลของคุณเพื่อรับลิงก์กู้คืนรหัสผ่าน
            </p>

            <div className="w-full flex flex-col">
              <input 
                type="email"
                required
                placeholder="อีเมล" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyle} 
              />
            </div>

            {/* ปุ่มส่งอีเมล */}
            <button onClick={() => router.push('/resetpass')}
              type="submit"
              disabled={isLoading || !email}
              className={primaryBtnStyle}
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5 2xl:h-6 2xl:w-6" /> : 'ส่งลิงก์กู้คืนรหัสผ่าน'}
            </button>

            {/* ปุ่มกลับไปหน้า Login */}
            <button
              type="button"
              onClick={() => router.push('/login')} // แก้ path กลับไปหน้า login ของคุณให้ถูกต้อง
              className="mt-6 text-sm 2xl:text-base text-gray-500 hover:text-[#4F46E5] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" /> กลับไปหน้าเข้าสู่ระบบ
            </button>
          </form>
        ) : (
          
          <div className="w-full flex flex-col items-center text-center animate-fade-in">
            {/* เช็คสถานะ: ถ้าสำเร็จแล้ว ให้โชว์ข้อความนี้ */}
            <div className="mx-auto w-16 h-16 2xl:w-20 2xl:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 className="h-10 w-10 2xl:h-12 2xl:w-12 text-green-500" />
            </div>
            
            <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-2">
              ตรวจสอบอีเมล
            </h1>
            
            <p className="text-gray-500 text-sm 2xl:text-base mb-6">
              เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่ <br/>
              <span className="font-semibold text-gray-800 break-all">{email}</span>
            </p>

            <button 
              onClick={() => router.push('/login')} 
              className={primaryBtnStyle}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        )}

      </div>
    </div>
  );
}