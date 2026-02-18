"use client"; // ต้องมีบรรทัดนี้เพราะมีการใช้ useState

import React, { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react'; // เรียกใช้ไอคอน (ถ้ายังไม่มีให้ npm install lucide-react)
import "@/app/styles/components.css";

export default function Dashboard() {
    // สร้างตัวแปรจำลองสถานะ: 'idle' (ว่าง) หรือ 'working' (กำลังทำงาน)
    const [machineStatus, setMachineStatus] = useState<'idle' | 'working'>('idle');

    return (
        <div className="bg-vibrant-indigo h-full w-full flex items-center justify-center relative">
            
            <div className={`bg-white shadow-2xl flex flex-col items-center justify-center text-center 
                             aspect-video
                             pi:w-[65%] pi:rounded-[20px]
                             2xl:w-[45%] 2xl:rounded-[40px]
                             transition-all duration-300
                             ${machineStatus === 'working' ? 'ring-4 ring-orange-300' : ''} 
                           `}>
                
                {machineStatus === 'idle' ? (
                    // === สถานะ 1: ระบบพร้อมใช้งาน (ดีไซน์เดิมของคุณ) ===
                    <>
                        <div className="mb-4 text-green-500 animate-bounce">
                            <CheckCircle2 size={48} className="pi:w-10 pi:h-10 2xl:w-16 2xl:h-16" />
                        </div>
                        <h1 className="text-Slate-gray pi:text-[24px] 2xl:text-[32px] font-bold">
                            ระบบพร้อมใช้งาน
                        </h1>
                        <h1 className="text-Slate-gray pi:text-[24px] 2xl:text-[32px] font-bold">
                            (System is ready to use)
                        </h1>
                    </>
                ) : (
                    // === สถานะ 2: กำลังทำงาน (แจ้งเตือน) ===
                    <>
                        <div className="mb-4 text-orange-500 animate-spin">
                            <Loader2 size={48} className="pi:w-10 pi:h-10 2xl:w-16 2xl:h-16" />
                        </div>
                        <h1 className="text-orange-600 pi:text-[24px] 2xl:text-[32px] font-bold">
                            ระบบกำลังทำงาน...
                        </h1>
                        <h1 className="text-orange-600 pi:text-[24px] 2xl:text-[32px] font-bold">
                            (Machine is working)
                        </h1>
                        <p className="text-gray-400 mt-2 pi:text-[14px] 2xl:text-[18px]">
                            กรุณารอสักครู่...
                        </p>
                    </>
                )}

            </div>

            {/* --- ปุ่มกดเล่นเพื่อเปลี่ยนสถานะ (ลบออกได้ตอนใช้งานจริง) --- */}
            <button 
                onClick={() => setMachineStatus(prev => prev === 'idle' ? 'working' : 'idle')}
                className="absolute bottom-5 right-5 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm transition-all"
            >
                Test Status: {machineStatus.toUpperCase()}
            </button>

        </div>
    );
}