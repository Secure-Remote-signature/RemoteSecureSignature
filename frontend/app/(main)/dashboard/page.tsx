"use client"; // ต้องมีบรรทัดนี้เพราะมีการใช้ useState

import React, { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react'; // เรียกใช้ไอคอน (ถ้ายังไม่มีให้ npm install lucide-react)
import "@/app/styles/components.css";

export default function Dashboard() {
    // สร้างตัวแปรจำลองสถานะ: 'idle' (ว่าง) หรือ 'working' (กำลังทำงาน)
    const [machineStatus, setMachineStatus] = useState<'idle' | 'working'>('idle');
    const [incomingDoc, setIncomingDoc] = useState<{ sender: string, subject: string } | null>(null);
    const handleSimulateIncoming = () => {
        setIncomingDoc({
            sender: "นางสาวสมหญิง ใจดี",
            subject: "เอกสารอนุมัติจบการศึกษา"
        });
    };
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
                {/* === ส่วน MODAL แจ้งเตือนเอกสารเข้า (จะแสดงเมื่อ incomingDoc ไม่เป็น null) === */}
            {incomingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* 1. ฉากหลังมืด (Overlay) */}
                    <div className="absolute inset-0 bg-[#1e1b4b]/90 backdrop-blur-sm animate-fade-in" />

                    {/* 2. กล่อง Modal */}
                    <div className="relative bg-white w-full max-w-md rounded-[20px] shadow-2xl overflow-hidden animate-zoom-in">
                        
                        {/* Header สีม่วง */}
                        <div className="bg-[#4F46E5] py-4 text-center">
                            <h2 className="text-white text-xl md:text-2xl font-bold">
                                มีเอกสารรอการลงนาม!!
                            </h2>
                        </div>

                        {/* Body เนื้อหา */}
                        <div className="p-6 md:p-8 flex flex-col gap-4">
                            <div className="text-lg text-gray-700 space-y-2">
                                <p>
                                    <span className="font-bold text-gray-900">จาก: </span> 
                                    {incomingDoc.sender}
                                </p>
                                <p>
                                    <span className="font-bold text-gray-900">เรื่อง: </span> 
                                    {incomingDoc.subject}
                                </p>
                            </div>

                            {/* Link ดูเอกสาร */}
                            <button className="text-[#4F46E5] underline font-medium hover:text-indigo-800 transition-colors self-center">
                                ดูเอกสาร
                            </button>

                            {/* ปุ่ม Action (ลงนาม / ปฏิเสธ) */}
                            <div className="flex gap-4 mt-4">
                                <button 
                                    onClick={() => alert("ไปหน้าลงนาม...")}
                                    className="flex-1 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold py-2 md:py-3 rounded-full shadow-lg transition-transform active:scale-95"
                                >
                                    ลงนามเอกสาร
                                </button>
                                <button 
                                    onClick={() => setIncomingDoc(null)} // ปิด Modal
                                    className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white font-bold py-2 md:py-3 rounded-full shadow-lg transition-transform active:scale-95"
                                >
                                    ปฏิเสธ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* --- ปุ่มกดเล่นเพื่อเปลี่ยนสถานะ (ลบออกได้ตอนใช้งานจริง) --- */}
            <button 
                onClick={() => setMachineStatus(prev => prev === 'idle' ? 'working' : 'idle')}
                className="absolute bottom-5 right-5 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm transition-all"
            >
                Test Status: {machineStatus.toUpperCase()}
            </button>
            <button 
                    onClick={handleSimulateIncoming}
                    className="absolute bottom-15 right-5 bg-green-500/80 hover:bg-green-600 text-white px-3 py-1 rounded text-xs backdrop-blur-sm shadow-lg animate-pulse"
                >
                    Test Incoming Alert 🔔
                </button>

        </div>
    );
}