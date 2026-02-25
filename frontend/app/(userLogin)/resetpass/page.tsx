'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import "@/app/styles/components.css";

// --- 1. สร้าง Component ไส้ใน (เพื่อใช้ useSearchParams) ---
function ResetPassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token'); // ดึงค่า ?token=... จาก URL

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); // เคลียร์ error เก่าก่อน

    // ตรวจสอบความถูกต้องเบื้องต้น
    if (password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);

    // จำลองการส่งข้อมูลไป API (รอ 1.5 วินาที)
    // ของจริงให้เปลี่ยนเป็น fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword: password }) })
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  // สไตล์ของ Input เดิมของคุณ (ปรับให้อยู่ใน relative div เพื่อใส่ไอคอน)
  const inputStyle = `
    w-full
    text-Slate-gray 
    mt-3 
    ring-1 ring-[#C3C5CB] 
    py-2
    pi:text-[16px] 2xl:text-[24px] 
    pi:rounded-[30px] 2xl:rounded-[50px] 
    pi:px-4 2xl:px-6 
    pi:mb-3 2xl:mb-3
    outline-none 
    focus:ring-2 focus:ring-[#4F46E5] 
    transition-all
  `;

  // สไตล์ของปุ่มหลักเดิมของคุณ
  const primaryBtnStyle = `
    bg-[#4F46E5] 
    mt-2
    text-[#F9FAFB] font-semibold 
    rounded-[30px] 
    p-3 
    px-5
    hover:opacity-90 hover:shadow-lg transition-all
    pi:text-[16px] 2xl:text-[24px]
    flex items-center justify-center gap-2
    disabled:opacity-70 disabled:cursor-not-allowed
  `;

  // กรณีไม่มี Token ใน URL (คนแอบพิมพ์ URL เข้ามาตรงๆ หรือลิงก์ผิด)
  // if (!token) {
  //   return (
  //     <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md p-8 text-center flex flex-col items-center">
  //       <h2 className="text-xl 2xl:text-2xl font-bold text-red-600 mb-2">ลิงก์ไม่ถูกต้อง หรือหมดอายุแล้ว</h2>
  //       <p className="text-gray-500 text-sm 2xl:text-base mb-6">กรุณากดขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง</p>
  //       <button onClick={() => router.push('/forgotpass')} className={primaryBtnStyle}>
  //         ไปหน้าลืมรหัสผ่าน
  //       </button>
  //     </div>
  //   );
  // }

  return (
    <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md p-8 pi:p-6 flex flex-col items-center">
      
      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-1">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-gray-500 text-sm pi:text-xs 2xl:text-base mb-4 text-center">
            กรุณากำหนดรหัสผ่านใหม่เพื่อเข้าสู่ระบบ
          </p>

          {/* กล่องแสดงข้อความ Error */}
          {errorMsg && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm 2xl:text-base rounded-lg text-center">
              {errorMsg}
            </div>
          )}

          <div className="w-full flex flex-col">
            <input 
              type="password"
              required
              placeholder="รหัสผ่านใหม่" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyle} 
            />
            
            <input 
              type="password"
              required
              placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputStyle} 
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className={primaryBtnStyle}
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5 2xl:h-6 2xl:w-6" /> : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>
      ) : (
        
        <div className="w-full flex flex-col items-center text-center animate-fade-in">
          <div className="mx-auto w-16 h-16 2xl:w-20 2xl:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
             <CheckCircle2 className="h-10 w-10 2xl:h-12 2xl:w-12 text-green-500" />
          </div>
          
          <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-2">
            สำเร็จ!
          </h1>
          
          <p className="text-gray-500 text-sm 2xl:text-base mb-6">
            รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว <br/>
            คุณสามารถใช้รหัสผ่านใหม่เข้าสู่ระบบได้ทันที
          </p>

          <button 
            onClick={() => router.push('/login')} 
            className={primaryBtnStyle}
          >
            ไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      )}

    </div>
  );
}

// --- 2. ตัว Wrap หลัก (ใส่ Suspense เพื่อให้ Next.js บิ้วท์ผ่าน) ---
export default function ResetPass() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>

      <Suspense fallback={
        <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl p-8 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-[#4F46E5]" />
        </div>
      }>
        <ResetPassContent />
      </Suspense>

    </div>
  );
}