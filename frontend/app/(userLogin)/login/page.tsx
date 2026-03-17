'use client';
import "@/app/styles/components.css";
import { useRouter } from 'next/navigation';
import axios from "axios";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const inputStyle = `
    w-full
    text-Slate-gray 
    mt-3 
    ring-1 ring-[#C3C5CB] 
    py-3
    pi:text-[16px] 2xl:text-[24px] 
    pi:rounded-[30px] 2xl:rounded-[50px] rounded-[30px]
    outline-none focus:ring-2 focus:ring-[#4F46E5] 
    transition-all
    pi:px-4 2xl:px-5 px-3
    pi:mb-5 2xl:mb-5 mb-2
    outline-none 
    focus:ring-2 focus:ring-[#4F46E5] 
    transition-all
  `;
  const primaryBtnStyle = `
    w-full
    bg-[#4F46E5] 
    mt-6 
    text-[#F9FAFB] font-semibold 
    rounded-[30px] 
    p-3 
    hover:opacity-90 hover:shadow-lg transition-all
    pi:text-[16px] 2xl:text-[24px] text-[18px]
  `;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/srs/user/login`;
      const response = await axios.post(apiUrl, {
        userEmail: email,
        userPassword: password,
      });

      console.log("เข้าสู่ระบบสำเร็จ", response.data);

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      if (response.status === 200) {
        const userData = response.data;
        localStorage.setItem("user_session", JSON.stringify({
          token: userData.token,
          name: userData.full_name,
          role: userData.role,
          id: userData.userId
        }));

        alert(`ยินดีต้อนรับคุณ ${userData.full_name}`);
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      console.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบ", error);
      
      if(axios.isAxiosError(error) && error.response) {
        setErrorMsg(error.response.data?.detail || error.response.data?.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>
      {/* Login Card */}
      <div className="relative z-10 bg-white mb-20 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md p-8 pi:p-6 mx-5 flex flex-col items-center">
        <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] text-[24px] mb-2">
          ลงชื่อเข้าใช้
        </h1>
        <form className="w-full flex flex-col mt-2" onSubmit={handleLogin}>
        <div className="w-full flex flex-col mt-2">
            <input 
              type="email"
              placeholder="อีเมล" 
              className={inputStyle} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="รหัสผ่าน"
              className={inputStyle} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {errorMsg && (
            <div className="text-red-500 text-sm mt-2">
              {errorMsg}
            </div>
          )}
          {/* forgot password link */}
          <div className="w-full flex justify-end items-center px-1 mt-1">
            <button
              type="button"
              onClick={() => router.push('/forgotpass')}
              className="text-[14px] 2xl:text-[16px] text-gray-500 hover:text-red-500 hover:underline transition-colors">
              ลืมรหัสผ่าน?
            </button>
          </div>
          {/* login button */}
          <button 
            type="submit"
            disabled={isLoading}  
            className={`${primaryBtnStyle} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >{isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  ); 
}