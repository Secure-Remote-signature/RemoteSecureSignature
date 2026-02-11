'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import "@/app/styles/components.css";
export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = () => {
    if (step === 1) {
      setStep(2);
    } else {
      console.log("Data ready for OTP:", formData);
      router.push('/otp');
    }
  };
  const inputStyle = `
    text-Slate-gray mt-3 
    pi:text-[16px] 2xl:text-[24px] 
    pi:p-2 2xl:px-4 pi:mb-2 2xl:mb-2 
    ring-1 ring-[#C3C5CB] 
    pi:rounded-[30px] 2xl:rounded-[50px] 
    outline-none focus:ring-2 focus:ring-[#4F46E5] 
    transition-all w-full
  `;
  const primaryBtnStyle = `
    bg-[#4F46E5] mt-5 
    text-[#F9FAFB] font-semibold 
    rounded-[30px] p-3 px-10 
    hover:opacity-90 transition-all shadow-md
    pi:text-[16px] 2xl:text-[20px]
  `;
  const linkStyle = "text-sm text-gray-500 mt-2 underline hover:text-[#4F46E5] cursor-pointer self-center";
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>
      {/* Register Card */}
      <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md 2xl:p-10 pi:p-6 flex flex-col items-center">
        
        <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-2">
          {step === 1 ? "สร้างบัญชีใหม่" : "ข้อมูลส่วนตัว"}
        </h1>
        <div className="w-full flex flex-col mt-2">
          {step === 1 ? (
            <>
              <input 
                name="username" 
                placeholder="ชื่อผู้ใช้" 
                className={inputStyle} 
                value={formData.username}
                onChange={handleChange}
              />
              <input 
                name="email" 
                type="email"
                placeholder="อีเมล" 
                className={inputStyle} 
                value={formData.email}
                onChange={handleChange}
              />
              <input 
                name="password" 
                type="password" 
                placeholder="รหัสผ่าน" 
                className={inputStyle} 
                value={formData.password}
                onChange={handleChange}
              />
              <input 
                name="confirmPassword" 
                type="password" 
                placeholder="ยืนยันรหัสผ่าน" 
                className={inputStyle} 
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </>
          ) : (
            <>
              <input 
                name="firstName" 
                placeholder="ชื่อจริง" 
                className={inputStyle} 
                value={formData.firstName}
                onChange={handleChange}
              />
              <input 
                name="lastName" 
                placeholder="นามสกุล" 
                className={inputStyle} 
                value={formData.lastName}
                onChange={handleChange}
              />
              <input 
                name="phone" 
                placeholder="เบอร์โทรศัพท์" 
                className={inputStyle} 
                value={formData.phone}
                onChange={handleChange}
              />
              <button onClick={() => setStep(1)} className={linkStyle}>
                ย้อนกลับไปแก้ไข
              </button>
            </>
          )}
        </div>

        <button onClick={handleSubmit} className={primaryBtnStyle}>
          {step === 1 ? "ต่อไป" : "รับรหัส OTP"}
        </button>

      </div>
    </div>
  );
}