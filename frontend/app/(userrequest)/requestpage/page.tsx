"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FilePlus, CheckCircle, Loader2, ChevronRight, Camera, 
  Check, RefreshCcw, ZoomIn, Upload
} from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import "@/app/styles/components.css";
import axios from 'axios';

interface Professor {
    userId: string;
    userName: string;
    userLastname: string;
}

export default function RequestDocumentPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    // --- ข้อมูล User และรายชื่ออาจารย์ ---
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [selectedProfId, setSelectedProfId] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");

    // --- ข้อมูลฟอร์ม ---
    const [formData, setFormData] = useState({
        Name: "",
        LastName: "",
        Role: "",
        Id: "",
        subject: "",
        details: ""
    });

    // --- ข้อมูลรูปภาพและ Crop ---
    const [image, setImage] = useState<string | null>(null);
    const [isFetchingCamera, setIsFetchingCamera] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // 1. ดึงข้อมูล User และ รายชื่ออาจารย์ ทันทีที่โหลดหน้า
    useEffect(() => {
        const savedData = sessionStorage.getItem("user_session");
        if (savedData) {
            const user = JSON.parse(savedData);
            setCurrentUserId(user.id);
            setFormData(prev => ({
                ...prev,
                Name: user.name,
                LastName: user.lastName,
                Id: user.id,
                Role: user.role
            }));
        }

        const fetchProfessors = async () => {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/staff`);
                setProfessors(res.data);
            } catch (err) {
                console.error("ดึงรายชื่ออาจารย์ไม่สำเร็จ", err);
            }
        };
        fetchProfessors();
    }, []);

    // 2. ฟังก์ชันอัปโหลดรูป
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => setImage(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // 3. ฟังก์ชันสั่งถ่ายรูป (จำลอง)
    const handleCaptureFromCNC = () => {
        setIsFetchingCamera(true);
        setTimeout(() => {
            setImage("https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=1000");
            setIsFetchingCamera(false);
        }, 2000);
    };

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // 4. ส่งข้อมูลไป Backend
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfId) return alert("กรุณาเลือกอาจารย์ที่จะส่งคำร้อง");
        if (!image) return alert("กรุณาเลือกรูปภาพเอกสาร");

        setIsLoading(true);

        const payload = {
            docId: "DOC-" + Date.now(),
            Name: formData.Name,
            LastName: formData.LastName,
            Role: formData.Role,
            Id: formData.Id,
            subject: formData.subject,
            message: formData.details,
            documentImage: image,
            ownerId: selectedProfId,
            clientId: currentUserId,
            camera: "none",
            signatureArea: croppedAreaPixels
        };

        try {
            // ใช้ axios และดึง URL จาก .env
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/srs/request/submit`, payload);
            
            if(response.status === 200) {
                setIsSubmitted(true);
            }
        } catch (error: unknown) {
            alert((error as { response?: { data?: { error?: string } } }).response?.data?.error || "เชื่อมต่อ Backend ไม่ได้! เช็ค IP และรัน Server หรือยัง?");
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = "w-full p-4 text-Slate-gray border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white transition-all";

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-muji overflow-hidden">
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {isSubmitted ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl p-10 text-center border border-gray-100">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งคำร้องสำเร็จ!</h2>
                            <p className="text-gray-500 mb-8">อาจารย์จะได้รับแจ้งเตือนบนหน้าจอสำหรับลงนามครับ</p>
                            <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-[#4F46E5] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">กลับสู่หน้าหลัก</button>
                        </div>
                    </div>
                ) : step === 1 ? (
                    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white w-full max-w-2xl rounded-[30px] shadow-xl border border-gray-100 overflow-hidden my-10">
                            <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm"><FilePlus className="text-[#4F46E5]" /></div>
                                <h2 className="text-xl font-bold text-gray-800">ยื่นคำร้องขอลงนาม</h2>
                            </div>
                            
                            <form className="p-6 md:p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    {/* หัวข้อ - ใช้ col-span-2 เพื่อให้อยู่บรรทัดบนสุดเต็มความกว้าง */}
                                    <p className="col-span-2 text-sm font-bold text-gray-600 mb-1">
                                        รายละเอียดผู้ส่งคำร้อง
                                    </p>

                                    {/* ช่องกรอกชื่อ */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-indigo-500 ml-2">ชื่อจริง</label>
                                        <input 
                                            type="text" 
                                            placeholder="ชื่อ" 
                                            className={inputStyle} 
                                            value={formData.Name}
                                            onChange={(e) => setFormData({...formData, Name: e.target.value})} 
                                            readOnly
                                        />
                                    </div>

                                    {/* ช่องกรอกนามสกุล */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[12px] font-semibold text-indigo-500 ml-2">นามสกุล</label>
                                            <input 
                                                type="text" 
                                                placeholder="นามสกุล" 
                                                className={inputStyle} 
                                                value={formData.LastName}
                                                //onChange={(e) => setFormData({...formData, LastName: e.target.value})} 
                                                readOnly
                                            
                                            />
                                    </div>

                                </div>
                                {/* --- เพิ่ม Dropdown เลือกอาจารย์ --- */}
                                <div>
                                    <p className="text-sm font-bold text-Slate-gray mb-2">ส่งถึงอาจารย์/เจ้าหน้าที่:</p>
                                    <select 
                                        value={selectedProfId} 
                                        onChange={(e) => setSelectedProfId(e.target.value)}
                                        className={inputStyle}
                                    >
                                        <option value="">--- กรุณาเลือกอาจารย์ ---</option>
                                        {professors.map(p => (
                                            <option key={p.userId} value={p.userId}>{p.userName} {p.userLastname}</option>
                                        ))}
                                    </select>
                                </div>

                                <input type="text" placeholder="หัวข้อเรื่อง (เช่น ขออนุมัติโครงการ...)" className={inputStyle} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
                                <textarea placeholder="รายละเอียดเพิ่มเติม..." className={`${inputStyle} h-32 resize-none`} onChange={(e) => setFormData({...formData, details: e.target.value})} />
                                
                                <button type="button" onClick={() => setStep(2)} className="w-full bg-[#4F46E5] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
                                    ถัดไป: จัดการไฟล์เอกสาร <ChevronRight size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Step 2: เลือกรูป & Crop */
                    <div className="flex-1 flex flex-col bg-slate-900 relative">
                        {!image ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-white p-6 gap-6">
                                <div className="text-center max-w-sm">
                                    <h2 className="text-2xl font-bold mb-2">นำเข้าเอกสาร</h2>
                                    <p className="text-gray-400">อัปโหลดไฟล์ หรือสั่งถ่ายรูปจากเครื่อง CNC</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                    <label className="flex-1 cursor-pointer bg-white text-slate-900 font-bold p-6 rounded-[25px] flex flex-col items-center gap-3">
                                        <Upload size={32} className="text-indigo-600" />
                                        <span>อัปโหลดไฟล์</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                    <button onClick={handleCaptureFromCNC} className="flex-1 bg-indigo-600 text-white font-bold p-6 rounded-[25px] flex flex-col items-center gap-3">
                                        {isFetchingCamera ? <Loader2 className="animate-spin" size={32} /> : <Camera size={32} />}
                                        <span>สั่ง CNC ถ่ายรูป</span>
                                    </button>
                                </div>
                                <button onClick={() => setStep(1)} className="text-gray-400 underline">ย้อนกลับไปแก้ไขข้อมูล</button>
                            </div>
                        ) : (
                            <div className="flex-1 relative flex flex-col">
                                <div className="flex-1 relative bg-black">
                                    <Cropper image={image} crop={crop} zoom={zoom} aspect={3.5 / 1} maxZoom={10} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                                </div>
                                <div className="bg-white p-6 flex flex-col gap-4 shadow-2xl z-20">
                                    <div className="flex items-center gap-4">
                                        <ZoomIn className="text-gray-400" size={20} />
                                        <input type="range" min={1} max={10} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 accent-[#4F46E5] cursor-pointer" />
                                        <span className="text-sm font-bold w-10">{zoom.toFixed(1)}x</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setImage(null)} className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl flex items-center gap-2"><RefreshCcw size={18} /> เปลี่ยนรูป</button>
                                        <button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-[#4F46E5] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50">
                                            {isLoading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> ส่งคำร้องลงนาม</>}
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