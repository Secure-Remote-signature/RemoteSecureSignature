'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import "@/app/styles/components.css";
export default function OtpPage() {
  const router = useRouter();
  // State เก็บเลข OTP 4 หลัก
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  // Refs สำหรับควบคุม Focus ของ Input ทั้ง 4 ช่อง
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // เริ่มต้นมาให้ Focus ที่ช่องแรกสุดเสมอ
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);
  // --- Logic การจัดการ Input (Clean & Smart) ---
  const handleChange = (index: number, value: string) => {
    // 1. รับเฉพาะตัวเลขเท่านั้น
    if (isNaN(Number(value))) return;
    // 2. อัปเดต State
    const newOtp = [...otp];
    // เอาตัวสุดท้ายที่พิมพ์ (เผื่อ user พิมพ์ซ้ำในช่องเดิม)
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    // 3. ย้าย Focus ไปช่องถัดไป (ถ้าไม่ได้ลบออก และไม่ใช่ช่องสุดท้าย)
    if (value && index < 3 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // ฟังก์ชันถอยหลังเมื่อกด Backspace ในช่องที่ว่างเปล่า
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const handleSubmit = () => {
    const otpCode = otp.join('');
    if (otpCode.length === 4) {
      console.log("ยืนยัน OTP:", otpCode);
      router.push('/dashboard'); // ยืนยันสำเร็จ -> ไปหน้า Dashboard
    } else {
      alert("กรุณากรอกรหัส OTP ให้ครบ 4 หลัก");
    }
  };
  // --- Clean Styles Variables (แยกออกมาเพื่อความสะอาด) ---
  const otpBoxStyle = `
    w-14 h-14 
    pi:w-16 pi:h-16 
    2xl:w-20 2xl:h-20
    text-center text-2xl font-bold text-[#1E293B]
    bg-[#F3F4F6] 
    rounded-2xl 
    border-none outline-none
    focus:ring-2 focus:ring-[#4F46E5] focus:bg-white
    transition-all
  `;
  const confirmBtnStyle = `
    bg-[#4F46E5] text-white font-semibold 
    rounded-full py-3 px-12 
    hover:bg-indigo-700 hover:shadow-lg
    transition-all duration-200
    pi:text-[18px] 2xl:text-[22px]
  `;
  return (
    <div className="min-h-screen relative flex items-center justify-center font-sans">
      {/* Background Split (ครึ่งขาว/ครึ่งน้ำเงิน) */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-white"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>
      {/* OTP Card (กล่องสีขาวตรงกลาง) */}
      <div className="relative z-10 bg-white rounded-[30px] shadow-2xl p-10 flex flex-col items-center w-full max-w-md pi:max-w-lg">
        <h2 className="text-[#1E293B] font-bold text-2xl pi:text-3xl mb-8">
          ยืนยันรหัส OTP
        </h2>
        {/* ช่องกรอก OTP 4 ช่อง */}
        <div className="flex gap-4 mb-10 justify-center w-full">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }} // เก็บ Ref อัตโนมัติ
              type="text"
              inputMode="numeric" // เพื่อให้มือถือเด้งคีย์บอร์ดตัวเลข
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={otpBoxStyle}
            />
          ))}
        </div>
        {/* ปุ่มยืนยัน */}
        <button 
          onClick={handleSubmit}
          className={confirmBtnStyle}
        >ยืนยัน</button>
      </div>
    </div>
  );
}