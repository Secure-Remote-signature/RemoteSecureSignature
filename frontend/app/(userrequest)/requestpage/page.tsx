"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FilePlus, ArrowLeft, User, BookOpen, FileText, 
  CheckCircle, Loader2, ChevronRight, Camera, 
  Check, RefreshCcw, ZoomIn
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import "@/app/styles/components.css";

export default function RequestDocumentPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // --- State สำหรับข้อมูลฟอร์ม ---
    const [formData, setFormData] = useState({
        studentName: "นางสาวสมหญิง ใจดี",
        studentId: "6530300001",
        subject: "",
        details: ""
    });

    // --- State สำหรับ Step 2: กล้อง CNC และเลือกจุดเซ็น ---
    const [image, setImage] = useState<string | null>(null);
    const [isFetchingCamera, setIsFetchingCamera] = useState(false);
    
    // ตั้งค่า Cropper
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // ฟังก์ชันจำลองการสั่งเครื่อง CNC ถ่ายรูป
    const handleCaptureFromCNC = () => {
        setIsFetchingCamera(true);
        // จำลองเวลาดึงภาพจากกล้อง CNC (ของจริงใช้ fetch API ดึงรูปมา)
        setTimeout(() => {
            // สมมติว่านี่คือรูปเอกสารที่ CNC ถ่ายมา (ใส่เป็น URL รูปตัวอย่าง)
            setImage("https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=1000");
            setIsFetchingCamera(false);
        }, 2000);
    };

    const onCropComplete = useCallback((_ : any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        // ส่งข้อมูล + พิกัด (croppedAreaPixels) ไปให้ระบบ
        setTimeout(() => {
            console.log("ส่งพิกัดให้ CNC:", croppedAreaPixels);
            setIsLoading(false);
            setIsSubmitted(true);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col overflow-hidden">
            
            {/* --- Header --- */}
            <header className="bg-white border-b-2 border-gray-100 p-4 px-6 flex items-center justify-between shadow-sm z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => step === 1 ? router.back() : setStep(1)} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="text-gray-500" />
                    </button>
                    <h1 className="text-xl font-black text-[#4F46E5]">
                        {step === 1 ? "ยื่นคำร้องขอลงนาม" : "ระบุตำแหน่งลายเซ็น"}
                    </h1>
                </div>
                {!isSubmitted && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-400">Step {step}/2</span>
                    </div>
                )}
            </header>

            <main className="flex-1 flex flex-col relative overflow-hidden">
                
                {isSubmitted ? (
                    /* --- หน้าจอเมื่อส่งสำเร็จ --- */
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl p-10 text-center animate-zoom-in border border-gray-100">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งคำร้องเรียบร้อยแล้ว!</h2>
                            <p className="text-gray-500 mb-8 leading-relaxed">
                                พิกัดเอกสารถูกส่งไปยังเครื่อง CNC เรียบร้อยแล้ว <br />
                                กรุณารออาจารย์ดำเนินการลงนาม
                            </p>
                            <button 
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-3 border-2 border-indigo-100 text-[#4F46E5] font-bold rounded-xl hover:bg-indigo-50 transition-colors"
                            >
                                กลับสู่หน้าหลัก
                            </button>
                        </div>
                    </div>
                ) : step === 1 ? (
                    /* --- Step 1: Form --- */
                    <div className="flex-1 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-white w-full max-w-2xl rounded-[30px] shadow-xl border border-gray-100 overflow-hidden my-auto">
                            <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm">
                                    <FilePlus className="text-[#4F46E5]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">ข้อมูลคำร้อง</h2>
                                    <p className="text-sm text-indigo-500">กรอกรายละเอียดเอกสารที่ต้องการให้อาจารย์เซ็น</p>
                                </div>
                            </div>

                            <form className="p-6 md:p-8 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                            <User size={14} /> ชื่อ-นามสกุล
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium">{formData.studentName}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                            <BookOpen size={14} /> รหัสนิสิต
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium">{formData.studentId}</div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                        <FileText size={14} /> เรื่อง
                                    </label>
                                    <input 
                                        type="text" required placeholder="เช่น เอกสารอนุมัติจบการศึกษา..."
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4F46E5] outline-none"
                                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-500">รายละเอียดเพิ่มเติม</label>
                                    <textarea 
                                        rows={3} required placeholder="ระบุรายละเอียด..."
                                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4F46E5] outline-none resize-none"
                                        onChange={(e) => setFormData({...formData, details: e.target.value})}
                                    ></textarea>
                                </div>

                                <button 
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
                                >
                                    ถัดไป: สั่งกล้อง CNC ถ่ายภาพ <ChevronRight size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* --- Step 2: เลือกจุดเซ็น (รับภาพจาก CNC) --- */
                    <div className="flex-1 flex flex-col animate-fade-in bg-slate-900 overflow-hidden relative">
                        {!image ? (
                            /* หน้าจอรอสั่งถ่ายภาพ */
                            <div className="flex-1 flex flex-col items-center justify-center text-white p-6">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-2 ${isFetchingCamera ? 'border-[#4F46E5] bg-indigo-500/20 animate-pulse' : 'border-dashed border-white/20 bg-white/10'}`}>
                                    {isFetchingCamera ? <Loader2 size={40} className="animate-spin text-[#4F46E5]" /> : <Camera size={40} className="text-white/50" />}
                                </div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {isFetchingCamera ? 'กำลังเชื่อมต่อกล้อง CNC...' : 'วางเอกสารบนเครื่อง CNC'}
                                </h2>
                                <p className="text-gray-400 text-center mb-8 max-w-sm">
                                    {isFetchingCamera 
                                        ? 'กรุณารอสักครู่ เครื่องกำลังถ่ายภาพเอกสารของคุณ' 
                                        : 'ตรวจสอบให้แน่ใจว่าวางกระดาษเข้ามุมเครื่องเรียบร้อยแล้ว จากนั้นกดปุ่มด้านล่างเพื่อถ่ายภาพ'}
                                </p>
                                
                                <button 
                                    onClick={handleCaptureFromCNC}
                                    disabled={isFetchingCamera}
                                    className="bg-[#4F46E5] text-white font-black px-12 py-4 rounded-2xl shadow-xl hover:bg-indigo-600 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    <Camera size={24} /> สั่งถ่ายภาพเอกสาร
                                </button>
                            </div>
                        ) : (
                            /* หน้าจอเลือกพิกัด */
                            <div className="flex-1 relative flex flex-col">
                                <div className="flex-1 relative bg-black">
                                    <Cropper
                                        image={image} 
                                        crop={crop} 
                                        zoom={zoom} 
                                        aspect={3.5 / 1}
                                        // 🔥 เพิ่ม maxZoom เป็น 10 ให้ซูมได้ลึกสะใจ
                                        maxZoom={10} 
                                        onCropChange={setCrop} 
                                        onZoomChange={setZoom} 
                                        onCropComplete={onCropComplete}
                                        showGrid={true}
                                    />
                                </div>

                                {/* แถบเครื่องมือควบคุมด้านล่าง */}
                                <div className="bg-white p-5 border-t flex flex-col gap-4 shadow-2xl z-20 shrink-0">
                                    
                                    {/* 🔥 แถบสไลเดอร์สำหรับปรับ Zoom (เหมาะกับ Touch Screen) */}
                                    <div className="flex items-center gap-4 px-2">
                                        <ZoomIn className="text-gray-400 shrink-0" size={20} />
                                        <input 
                                            type="range" 
                                            min={1} 
                                            max={10} 
                                            step={0.1}
                                            value={zoom} 
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                                        />
                                        <span className="text-sm font-bold text-gray-500 w-12 text-right">{zoom.toFixed(1)}x</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setImage(null)}
                                            className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 shrink-0"
                                        >
                                            <RefreshCcw size={20} /> ถ่ายใหม่
                                        </button>
                                        <button 
                                            onClick={handleSubmit} disabled={isLoading}
                                            className="flex-1 bg-[#4F46E5] text-white font-black py-3 rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> ยืนยันพิกัดเซ็นชื่อ</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}