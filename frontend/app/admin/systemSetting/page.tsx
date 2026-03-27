"use client";

import React, { useState } from "react";

const initialSettings = {
  maintenanceMode: false,
  systemNotice: "ระบบทำงานปกติ",
  
  defaultDrawSpeed: 3000,
  defaultPenUpAngle: 40,
  defaultPenDownAngle: 90,
  autoHomeAfterJob: true,

  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
};

const ToggleSwitch = ({ name, checked, label, description, onChange }: { name: string, checked: boolean, label: string, description: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
    <div>
      <p className="text-sm font-bold text-gray-800">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    </label>
  </div>
);

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      alert("✅ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว\n(การตั้งค่าฮาร์ดแวร์จะมีผลกับคิวงานถัดไป)");
    }, 800);
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ตั้งค่าระบบ (System Settings)</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการค่าเริ่มต้นของฮาร์ดแวร์, ความปลอดภัย, และโหมดซ่อมบำรุง</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">ระบบส่วนกลาง (Global Settings)</h2>
            </div>
            <div className="p-6 space-y-5">
              
              <div className={`p-4 rounded-xl border ${settings.maintenanceMode ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-100'} transition-colors`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-bold ${settings.maintenanceMode ? 'text-rose-700' : 'text-gray-800'}`}>
                      โหมดปิดปรับปรุง (Maintenance Mode)
                    </p>
                    <p className={`text-xs mt-0.5 ${settings.maintenanceMode ? 'text-rose-500' : 'text-gray-500'}`}>
                      หากเปิดโหมดนี้ หน้าเว็บฝั่งผู้ใช้งาน (Client) จะหยุดรับคำสั่งเซ็นใหม่ทั้งหมด
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ข้อความแจ้งเตือนหน้าเว็บ (System Notice)</label>
                <input 
                  type="text" 
                  name="systemNotice" 
                  value={settings.systemNotice} 
                  onChange={handleChange} 
                  className="w-full border text-Slate-gray border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="เช่น: ระบบกำลังปิดปรับปรุงเซิร์ฟเวอร์ กรุณาใช้งานหลัง 12:00 น."
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">ความปลอดภัย (Security Parameters)</h2>
            </div>
            <div className="p-6 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เวลาหมดอายุ Session (Session Timeout)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      name="sessionTimeoutMinutes" 
                      value={settings.sessionTimeoutMinutes} 
                      onChange={handleChange} 
                      className="w-full border text-Slate-gray border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-gray-400 font-bold">นาที</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">จำกัดจำนวนล็อกอินผิด (Max Login Attempts)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      name="maxLoginAttempts" 
                      value={settings.maxLoginAttempts} 
                      onChange={handleChange} 
                      className="w-full border text-Slate-gray border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-gray-400 font-bold">ครั้ง</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-gray-200">
            <button 
              type="button" 
              className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-colors text-sm"
            >
              ยกเลิกการเปลี่ยนแปลง
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-colors shadow-md text-sm flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกการตั้งค่า"
              )}
            </button>
          </div>

        </form>
      </div>
    </section>
  );
}