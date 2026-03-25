"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react'; 
import "@/app/styles/components.css";
import { useRouter } from 'next/navigation';
import api from '@/app/lib/api';

export default function Dashboard() {
    const router = useRouter();
    const [machineStatus, setMachineStatus] = useState<'idle' | 'working'>('idle');
    useEffect(() => {
        const savedData = sessionStorage.getItem("user_session");
        if (!savedData) {
        router.push("/login");
        return;
        }
        try {
        JSON.parse(savedData);
        } catch (error) {
        console.error("Error parsing user data", error);
        router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        const checkStatus = async () => {
            try {
            const response = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/machine/status`);
            if (response.data.status) {
                setMachineStatus(response.data.status);
            }
            } catch (error) {
            console.error("เชื่อมต่อสถานะเครื่องไม่ได้:", error);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 3000);

        return () => clearInterval(interval); // เคลียร์เมื่อปิดหน้าจอ
        }, []);

    // const [incomingDoc, setIncomingDoc] = useState<{ sender: string, subject: string, details: string } | null>(null);
    
    // State สำหรับจัดการการปฏิเสธเอกสาร
    // const [isRejecting, setIsRejecting] = useState(false);
    // const [rejectReason, setRejectReason] = useState("");

    // const handleSimulateIncoming = () => {
    //     setIncomingDoc({
    //         sender: "นางสาวสมหญิง ใจดี",
    //         subject: "เอกสารอนุมัติจบการศึกษา",
    //         details: "เรียนอาจารย์สมชาย อาจหาญ ดิฉันนางสาวสมหญิง ใจดี นิสิตปี 4 รหัสนิสิต 6530300001 มีความประสงค์จะขออนุมัติจบการศึกษา จึงขอความอนุเคราะห์จากอาจารย์ในการลงนามอนุมัติเอกสารนี้ด้วยค่ะ"
    //     });
    //     setIsRejecting(false);
    //     setRejectReason("");
    // };

    // const handleConfirmReject = () => {
    //     if (!rejectReason.trim()) {
    //         alert("กรุณาระบุเหตุผลการปฏิเสธเอกสารครับ");
    //         return;
    //     }
    //     console.log("ปฏิเสธเอกสารเพราะ:", rejectReason);
    //     alert("ส่งข้อมูลการปฏิเสธเอกสารเรียบร้อยแล้ว");
    //     setIsRejecting(false);
    //     setRejectReason("");
    //     setIncomingDoc(null);
    // };

    return (  
        <div className="bg-vibrant-indigo h-full w-full flex items-center justify-center relative overflow-hidden">
            
            {/* --- หน้าจอหลัก Dashboard --- */}
            <div className={`bg-white shadow-2xl flex flex-col items-center justify-center text-center 
                             w-[90%] py-10 rounded-2xl aspect-auto
                             pi:w-[65%] pi:py-0 pi:rounded-[20px] pi:aspect-video
                             2xl:w-[45%] 2xl:rounded-[40px]
                             transition-all duration-300
                             ${machineStatus === 'working' ? 'ring-4 ring-orange-300' : ''} 
                            `}>
                
                {machineStatus === 'idle' ? (
                    <>
                        <div className="mb-4 text-green-500 animate-bounce">
                            <CheckCircle2 className="w-14 h-14 pi:w-10 pi:h-10 2xl:w-16 2xl:h-16" />
                        </div>
                        <h1 className="text-Slate-gray text-2xl pi:text-[24px] 2xl:text-[32px] font-bold">
                            ระบบพร้อมใช้งาน
                        </h1>
                        <h1 className="text-Slate-gray text-lg pi:text-[20px] 2xl:text-[28px] font-medium mt-1">
                            (System is ready to use)
                        </h1>
                    </>
                ) : (
                    <>
                        <div className="mb-4 text-orange-500 animate-spin">
                            <Loader2 className="w-14 h-14 pi:w-10 pi:h-10 2xl:w-16 2xl:h-16" />
                        </div>
                        <h1 className="text-orange-600 text-2xl pi:text-[24px] 2xl:text-[32px] font-bold">
                            ระบบกำลังทำงาน...
                        </h1>
                        <h1 className="text-orange-600 text-lg pi:text-[20px] 2xl:text-[28px] font-medium mt-1">
                            (Machine is working)
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm pi:text-[14px] 2xl:text-[18px]">
                            กรุณารอสักครู่...
                        </p>
                    </>
                )}
            </div>

            {/* === ส่วน MODAL แจ้งเตือนเอกสารเข้า === */}
            {/*
            {incomingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#1e1b4b]/90 backdrop-blur-sm animate-fade-in" />

                    <div className="relative bg-white w-full max-w-md rounded-[20px] shadow-2xl flex flex-col max-h-[95vh] animate-zoom-in">
                        
                        <div className={`${!isRejecting ? 'bg-[#4F46E5]' : 'bg-[#DC2626]'} py-3 pi:py-4 text-center shrink-0 transition-colors rounded-t-[20px]`}>
                            <h2 className="text-white text-lg pi:text-xl md:text-2xl font-bold">
                                {!isRejecting ? 'มีเอกสารรอการลงนาม!!' : 'ระบุเหตุผลการปฏิเสธ'}
                            </h2>
                        </div>

                        <div className="p-4 pi:p-6 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                            
                            {!isRejecting ? (
                                <>
                                    <div className="text-base pi:text-lg text-gray-700 space-y-2">
                                        <p><span className="font-bold text-gray-900">จาก: </span> {incomingDoc.sender}</p>
                                        <p><span className="font-bold text-gray-900">เรื่อง: </span> {incomingDoc.subject}</p>
                                        
                                        <div>
                                            <span className="font-bold text-gray-900">รายละเอียด: </span>
                                            <div className="whitespace-pre-line text-gray-700 mt-1 text-sm pi:text-base border p-3 rounded-lg bg-gray-50">
                                                {incomingDoc.details}
                                            </div>
                                        </div>
                                    </div>

                                    <button className="text-[#4F46E5] underline font-medium hover:text-indigo-800 transition-colors self-center text-sm pi:text-base">
                                        ดูเอกสาร
                                    </button>

                                    <div className="flex gap-3 mt-2 shrink-0">
                                        <button 
                                            onClick={() => router.push('/signing?id=DOC-001')} 
                                            className="flex-1 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold py-2 pi:py-3 rounded-full shadow-md transition-transform active:scale-95 text-sm pi:text-base"
                                        >
                                            ลงนามเอกสาร
                                        </button>
                                        <button 
                                            onClick={() => setIsRejecting(true)} 
                                            className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white font-bold py-2 pi:py-3 rounded-full shadow-md transition-transform active:scale-95 text-sm pi:text-base"
                                        >
                                            ปฏิเสธ
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="animate-fade-in flex flex-col gap-3">
                                    <div className="text-center text-gray-500 mb-1">
                                        <MessageSquareX className="2xl:w-10 2xl:h-10 pi:w-7 pi:h-7 mx-auto text-red-400 mb-2" />
                                        <p className="2xl:text-[16px] pi:text-[14px]">กรุณาระบุเหตุผลที่ปฏิเสธเอกสารนี้ <br/>เพื่อส่งกลับไปยัง <b>{incomingDoc.sender}</b></p>
                                    </div>

                                    <textarea 
                                        rows={1}
                                        placeholder="พิมพ์เหตุผลของคุณที่นี่..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className="w-full p-3 border text-Slate-gray rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none transition-all text-sm pi:text-base"
                                    ></textarea>

                                    <div className="flex flex-col gap-2 mt-2 shrink-0">
                                        <button 
                                            onClick={handleConfirmReject}
                                            disabled={!rejectReason.trim()}
                                            className="w-full bg-[#DC2626] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-700 text-white font-bold py-2 pi:py-3 rounded-full shadow-md transition-all active:scale-95 2xl:text-[16px] pi:text-[14px]"
                                        >
                                            ยืนยันการปฏิเสธ
                                        </button>
                                        <button 
                                            onClick={() => setIsRejecting(false)} 
                                            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-2 pi:py-3 rounded-full transition-all active:scale-95 2xl:text-[16px] pi:text-[14px]"
                                        >
                                            <ArrowLeft size={18} /> ย้อนกลับ
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )} */}

            {/* --- ปุ่มทดสอบมุมขวาล่าง --- */}
            {/* <div className="absolute bottom-5 right-5 flex flex-col gap-2 z-40 scale-90 origin-bottom-right pi:scale-100">
                <button 
                    onClick={handleSimulateIncoming}
                    className="bg-green-500/90 hover:bg-green-600 text-white px-4 py-2 rounded-lg backdrop-blur-sm shadow-lg animate-pulse text-sm font-bold"
                >
                    Test Incoming Alert 🔔
                </button>
                <button 
                    onClick={() => setMachineStatus(prev => prev === 'idle' ? 'working' : 'idle')}
                    className="bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm transition-all"
                >
                    Test Status: {machineStatus.toUpperCase()}
                </button>
            </div> */}

            {/* --- ปุ่ม Logout มุมบนขวา --- */}
            

        </div>
    );
}