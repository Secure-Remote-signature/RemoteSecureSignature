"use client";

import React from 'react';
import { User, Save, Lock } from 'lucide-react';
import "@/app/styles/components.css";

export default function SettingsPage() {
  return (
    <div className="w-full h-full flex flex-col bg-[#F9FAFB]">
      
      {/* --- 1. Header --- */}
      <div className="bg-white p-4 md:px-8 shrink-0 flex items-center justify-between z-10 border-b-2 border-gray-100 shadow-sm">
        <div>
          <h1 className="2xl:text-[32px] pi:text-[20px] font-bold text-gray-800">การตั้งค่าบัญชี</h1>
          <p className="text-gray-500 text-sm pi:text-lg">Account Settings</p>
        </div>
        
        <button 
          onClick={() => alert("บันทึกการตั้งค่าเรียบร้อย!")}
          className="flex items-center gap-2 bg-[#4F46E5] hover:bg-indigo-700 text-white 2xl:px-6 2xl:py-3 pi:py-2 pi:px-4 rounded-xl font-bold pi:text-xl shadow-md transition-all active:scale-95"
        >
          <Save className="w-4 h-4 pi:w-5 pi:h-5" /> บันทึก
        </button>
      </div>

      {/* --- 2. Content Area --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pi:p-10">
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
                  defaultValue="สมชาย" 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  defaultValue="อาจหาญ" 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                <input 
                  type="text" 
                  defaultValue="อาจารย์" 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">คณะ</label>
                <input 
                  type="text" 
                  defaultValue="คณะวิศวกรรมศาสตร์" 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input 
                  type="text" 
                  defaultValue="081-234-5678" 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border border-gray-200 bg-gray-50 text-gray-500 roundw-full p-3 pi:p-4 text-base pi:text-xl border text-Slate-gray rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-alled-xl cursor-not-allowed" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm pi:text-lg font-medium text-gray-700 mb-1">อีเมล (ไม่สามารถแก้ไขได้)</label>
                <input 
                  type="email" 
                  defaultValue="somchai@example.com" 
                  disabled 
                  className="w-full p-3 pi:p-4 text-base pi:text-xl border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed" 
                />
              </div>
            </div>
          </div>

          {/* --- ส่วนความปลอดภัย --- */}
          <div className="mt-10 pi:mt-14">
            <h2 className="text-xl pi:text-2xl font-bold text-gray-800 border-b pb-2 mb-6 flex items-center gap-2">
              <Lock className="text-indigo-600 w-6 h-6 pi:w-8 pi:h-8" /> ความปลอดภัย
            </h2>
            
            <button className="flex items-center justify-center md:justify-start gap-2 w-full md:w-auto px-6 py-3 pi:py-4 pi:px-8 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-50 font-bold pi:text-xl transition-colors active:scale-95">
              <Lock className="w-5 h-5 pi:w-6 pi:h-6" /> เปลี่ยนรหัสผ่าน
            </button>
            <p className="mt-3 text-sm pi:text-base text-gray-500">
              หากต้องการเปลี่ยนรหัสผ่าน ระบบจะส่งลิงก์ยืนยันไปยังอีเมลของคุณ
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}