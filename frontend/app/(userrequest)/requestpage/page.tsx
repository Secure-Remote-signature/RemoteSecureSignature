"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FilePlus, ArrowLeft, User, BookOpen, FileText, 
  CheckCircle, Loader2, ChevronRight, Camera, 
  Check, RefreshCcw, ZoomIn, Upload
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

    // --- State สำหรับ Step 2 ---
    const [image, setImage] = useState<string | null>(null);
    const [isFetchingCamera, setIsFetchingCamera] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // 1. ฟังก์ชันสั่งเครื่อง CNC ถ่ายรูป (เหมือนเดิม)
    const handleCaptureFromCNC = () => {
        setIsFetchingCamera(true);
        setTimeout(() => {
            setImage("https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=1000");
            setIsFetchingCamera(false);
        }, 2000);
    };

    // 2. ฟังก์ชันอัปโหลดไฟล์จากเครื่องนิสิต (เพิ่มใหม่)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onCropComplete = useCallback((_ : any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
        docId: "DOC-" + Date.now(),
        studentName: formData.studentName,
        subject: formData.subject,
        signatureArea: croppedAreaPixels, // พิกัดที่ครอปไว้ (x, y, width, height)
        documentImage: image // รูป Base64 ที่คุณเลือกหรือถ่ายจาก CNC
    };

    try {
        // 🔥 เปลี่ยนจาก localhost เป็น IP เครื่องคอมพิวเตอร์คุณ
        const response = await fetch('http://192.168.1.39:5000/api/request-sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(response.ok) {
            setIsSubmitted(true);
        } else {
            alert("Server ตอบกลับด้วย Error");
        }
    } catch (error) {
        // ถ้าขึ้น Alert นี้ แสดงว่ามือถือยังหาคอมไม่เจอ (เช็ค Wi-Fi หรือ IP)
        alert("เชื่อมต่อ Backend ไม่ได้! เช็คว่ารัน server.js หรือยัง? และ IP ถูกต้องไหม?");
    } finally {
        setIsLoading(false);
    }
};

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col overflow-hidden font-muji">
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {isSubmitted ? (
                    /* Success Screen */
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl p-10 text-center animate-zoom-in border border-gray-100">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งคำร้องสำเร็จ!</h2>
                            <p className="text-gray-500 mb-8">อาจารย์จะได้รับแจ้งเตือนบนจอ Raspberry Pi เพื่อลงนามครับ</p>
                            <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-[#4F46E5] text-white font-bold rounded-2xl shadow-lg">กลับสู่หน้าหลัก</button>
                        </div>
                    </div>
                ) : step === 1 ? (
                    /* Step 1: Form */
                    <div className="flex-1 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-white w-full max-w-2xl rounded-[30px] shadow-xl border border-gray-100 overflow-hidden my-auto">
                            <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm"><FilePlus className="text-[#4F46E5]" /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">ยื่นคำร้องขอลงนาม</h2>
                                    <p className="text-sm text-indigo-500">ระบุรายละเอียดและเลือกไฟล์เอกสาร</p>
                                </div>
                            </div>
                            <form className="p-6 md:p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-xs text-indigo-400 font-bold uppercase">ชื่อนิสิต</p>
                                        <p className="font-bold text-gray-700">{formData.studentName}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-xs text-indigo-400 font-bold uppercase">รหัสนิสิต</p>
                                        <p className="font-bold text-gray-700">{formData.studentId}</p>
                                    </div>
                                </div>
                                <input type="text" placeholder="เรื่อง (เช่น ขออนุมัติโครงการ...)" className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-400" onChange={(e) => setFormData({...formData, subject: e.target.value})} />
                                <textarea placeholder="รายละเอียดเพิ่มเติม..." className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-400 h-32 resize-none" onChange={(e) => setFormData({...formData, details: e.target.value})} />
                                
                                <button type="button" onClick={() => setStep(2)} className="w-full bg-[#4F46E5] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
                                    ถัดไป: จัดการไฟล์เอกสาร <ChevronRight size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Step 2: เลือกรูป (อัปโหลด หรือ CNC ถ่าย) */
                    <div className="flex-1 flex flex-col animate-fade-in bg-slate-900 overflow-hidden relative">
                        {!image ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-white p-6 gap-6">
                                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-dashed border-white/20">
                                        <Camera size={32} className="text-white/50" />
                                    </div>
                                    <h2 className="text-2xl font-bold">เลือกวิธีนำเข้าเอกสาร</h2>
                                    <p className="text-gray-400">คุณสามารถอัปโหลดไฟล์ที่มีอยู่ หรือสั่งให้เครื่อง CNC ถ่ายภาพเอกสารที่วางอยู่ก็ได้ครับ</p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                    {/* ปุ่มอัปโหลด */}
                                    <label className="flex-1 cursor-pointer bg-white text-slate-900 font-bold p-6 rounded-[25px] shadow-xl hover:bg-gray-100 transition-all flex flex-col items-center gap-3">
                                        <Upload size={32} className="text-indigo-600" />
                                        <span>อัปโหลดไฟล์</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                    
                                    {/* ปุ่มสั่ง CNC ถ่ายรูป */}
                                    <button onClick={handleCaptureFromCNC} disabled={isFetchingCamera} className="flex-1 bg-indigo-600 text-white font-bold p-6 rounded-[25px] shadow-xl hover:bg-indigo-700 transition-all flex flex-col items-center gap-3 disabled:opacity-50">
                                        {isFetchingCamera ? <Loader2 className="animate-spin" size={32} /> : <Camera size={32} />}
                                        <span>สั่ง CNC ถ่ายรูป</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* หน้าจอ Cropper (เหมือนเดิมแต่เพิ่ม MaxZoom) */
                            <div className="flex-1 relative flex flex-col">
                                <div className="flex-1 relative bg-black">
                                    <Cropper image={image} crop={crop} zoom={zoom} aspect={3.5 / 1} maxZoom={10} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                                </div>
                                <div className="bg-white p-6 border-t flex flex-col gap-4 shadow-2xl z-20">
                                    <div className="flex items-center gap-4 px-2">
                                        <ZoomIn className="text-gray-400" size={20} />
                                        <input type="range" min={1} max={10} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]" />
                                        <span className="text-sm font-bold text-gray-500 w-12 text-right">{zoom.toFixed(1)}x</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setImage(null)} className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl flex items-center gap-2"><RefreshCcw size={20} /> เปลี่ยนรูป</button>
                                        <button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-[#4F46E5] text-white font-black py-3 rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50">
                                            {isLoading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> ยืนยันพิกัดและส่งคำร้อง</>}
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