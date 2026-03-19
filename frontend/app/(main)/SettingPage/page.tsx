"use client";

import React, { useEffect, useState} from 'react';
import { User, Save, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import "@/app/styles/components.css";
import axios from 'axios';

interface Profile {
  userName: string;
  userLastname: string;
  userPhone: string;
  userRole: string;
  userfacultyName?: string;
  userEmail: string;
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('user_session');
    if (!rawSession) {
      setLoading(false);
      setErrorMsg('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    try {
      const parsed = JSON.parse(rawSession);
      const id = String(parsed.id);
      setUserId(id);
    } catch {
      setLoading(false);
      setErrorMsg('ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/profile/${userId}`);
        const data = res.data as Profile;
        setProfile(data);
        setFirstName(data.userName || '');
        setLastName(data.userLastname || '');
        setPhone(data.userPhone || '');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          setErrorMsg(error.response.data?.error || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        } else {
          setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const saveProfile = async () => {
    if (!userId) return;
    setErrorMsg('');
    setSaving(true);

    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/updateuser/${userId}`, {
        userName: firstName,
        userLastname: lastName,
        userPhone: phone,
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              userName: firstName,
              userLastname: lastName,
              userPhone: phone,
            }
          : prev,
      );

      const rawSession = sessionStorage.getItem('user_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        sessionStorage.setItem(
          'user_session',
          JSON.stringify({ ...parsed, name: firstName, lastName: lastName }),
        );
      }

      alert('บันทึกข้อมูลสำเร็จ');
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setErrorMsg(error.response.data?.error || 'บันทึกข้อมูลไม่สำเร็จ');
      } else {
        setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#F9FAFB]">
      
      {/* --- 1. Header --- */}
      <div className="bg-white p-4 md:px-8 shrink-0 flex items-center justify-between z-10 border-b-2 border-gray-100 shadow-sm">
        <div>
          <h1 className="2xl:text-[32px] pi:text-[20px] font-bold text-gray-800">การตั้งค่าบัญชี</h1>
          <p className="text-gray-500 text-sm pi:text-lg">Account Settings</p>
        </div>
        
        <button 
          onClick={saveProfile}
          disabled={saving}
          className="flex items-center gap-2 bg-[#4F46E5] hover:bg-indigo-700 text-white 2xl:px-6 2xl:py-3 pi:py-2 pi:px-4 rounded-xl font-bold pi:text-xl shadow-md transition-all active:scale-95"
        >
          <Save className="w-4 h-4 pi:w-5 pi:h-5" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* --- 2. Content Area --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pi:p-10">
        {errorMsg && (
          <div className="max-w-4xl mx-auto mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {errorMsg}
          </div>
        )}

        {/* กล่องการตั้งค่า (Card) */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl pi:rounded-[30px] shadow-sm border border-gray-200 2xl:p-5 pi:p-4 flex flex-col md:flex-rowanimate-fade-in">
          
          {/* --- ส่วนข้อมูลส่วนตัว --- */}
          <div>
            <h2 className="2xl:text-[32px] pi:text-[20px] font-bold text-gray-800 border-b pb-2 mb-3 flex items-center gap-2">
              <User className="text-indigo-600 2xl:w-8 2xl:h-8 pi:w-6 pi:h-6" /> ข้อมูลส่วนตัว
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pi:gap-6">
              <div>
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">ชื่อ</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    />
              </div>
              <div className="flex gap-2>">
                <button 
                  onClick={() => router.push('/changepass')}
                  disabled={passSaving}
                  className="flex items-center gap-2 bg-[#4F46E5] hover:bg-indigo-700 text-white 2xl:px-6 2xl:py-3 pi:py-2 pi:px-4 rounded-xl font-bold pi:text-xl shadow-md transition-all active:scale-95"
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pi:gap-6">
                <div>
                  <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1 ">ตำแหน่ง (ไม่สามารถแก้ไขได้)</label>
                  <input 
                    type="text" 
                    value={profile?.userRole || ''}
                    disabled
                    className="w-full p-3 pi:p-4 text-base pi:text-xl border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">คณะ (ไม่สามารถแก้ไขได้)</label>
                  <input 
                    type="text" 
                    value={profile?.userfacultyName || '-'}
                    disabled
                    className="w-full p-3 pi:p-4 text-base pi:text-xl border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed" 
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">อีเมล (ไม่สามารถแก้ไขได้)</label>
                <input 
                  type="email" 
                  value={profile?.userEmail || ''}
                  disabled 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
};