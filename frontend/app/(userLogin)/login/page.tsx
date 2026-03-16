'use client';
import "@/app/styles/components.css";
import { useRouter } from 'next/navigation';
export default function Login() {
  const router = useRouter();
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
  // สไตล์ของปุ่มหลัก (Login)
  const primaryBtnStyle = `
    w-full
    bg-[#4F46E5] 
    mt-6 
    text-[#F9FAFB] font-semibold 
    rounded-[30px] 
    p-3 
    hover:opacity-90 hover:shadow-lg transition-all
    pi:text-[16px] 2xl:text-[24px]
  `;
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>
      {/* Login Card */}
      <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md p-8 pi:p-6 flex flex-col items-center">
        <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-2">
          ลงชื่อเข้าใช้
        </h1>
        <div className="w-full flex flex-col mt-2">
          <input 
            placeholder="ชื่อผู้ใช้" 
            className={inputStyle} 
          />
          <input 
            placeholder="รหัสผ่าน" 
            type="password" // ซ่อนรหัสผ่าน
            className={inputStyle} 
          />
        </div>
        {/* ส่วนจัดการ Link (ลืมรหัสผ่าน / สมัครสมาชิก) */}
        <div className="w-full flex justify-end items-center px-1 mt-1">
          <button
             onClick={() => router.push('/forgotpass')}
             className="text-sm text-gray-500 hover:text-red-500 hover:underline transition-colors">
            ลืมรหัสผ่าน?
          </button>
        </div>
        {/* ปุ่มเข้าสู่ระบบ */}
        <button 
          onClick={() => router.push('/dashboard')} // สมมติว่า Login ผ่านแล้วไป Dashboard
          className={primaryBtnStyle}
        >เข้าสู่ระบบ</button>
      </div>
    </div>
  );
}