'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import api, { isAxiosError } from '@/app/lib/api';
import "@/app/styles/components.css";

export default function ChangePass() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('user_session');
    if (!raw) {
      setErrorMsg('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setUserId(parsed?.id ? String(parsed.id) : null);
    } catch {
      setErrorMsg('ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
      router.replace('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!userId) {
      setErrorMsg('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    // if (newPassword.length < 6) {
    //   setErrorMsg('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร');
    //   return;
    // }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/change-password/${userId}`, {
        oldPassword,
        newPassword,
      });

      setIsSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        setErrorMsg(error.response.data?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      } else {
        setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>

      <div className="relative z-10 bg-white mb-10 rounded-[25px] shadow-2xl w-full max-w-sm 2xl:max-w-md p-8 pi:p-6 flex flex-col items-center">
        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
            <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-1">เปลี่ยนรหัสผ่าน</h1>
            <p className="text-gray-500 text-sm pi:text-xs 2xl:text-base mb-4 text-center">
              กรุณากรอกรหัสเดิมและกำหนดรหัสผ่านใหม่
            </p>

            {errorMsg && (
              <div className="w-full mb-3 p-3 bg-red-50 border border-red-200 text-red-600 text-sm 2xl:text-base rounded-lg text-center">
                {errorMsg}
              </div>
            )}

            <div className="w-full flex flex-col">
              <input
                type="password"
                required
                placeholder="รหัสผ่านเดิม"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={inputStyle}
              />

              <input
                type="password"
                required
                placeholder="รหัสผ่านใหม่"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputStyle}
              />

              <input
                type="password"
                required
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={primaryBtnStyle}
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5 2xl:h-6 2xl:w-6" /> : <><Lock className="h-5 w-5" /> ยืนยันการเปลี่ยนรหัสผ่าน</>}
            </button>

            <button
              type="button"
              onClick={() => router.push('/SettingPage')}
              className="mt-6 text-sm 2xl:text-base text-gray-500 hover:text-[#4F46E5] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" /> กลับหน้าตั้งค่า
            </button>
          </form>
        ) : (
          <div className="w-full flex flex-col items-center text-center animate-fade-in">
            <div className="mx-auto w-16 h-16 2xl:w-20 2xl:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 2xl:h-12 2xl:w-12 text-green-500" />
            </div>

            <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px] mb-2">สำเร็จ!</h1>
            <p className="text-gray-500 text-sm 2xl:text-base mb-6">
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
            </p>

            <button
              onClick={() => router.push('/SettingPage')}
              className={primaryBtnStyle}
            >
              กลับหน้าตั้งค่า
            </button>
          </div>
        )}
      </div>
    </div>
  );
}