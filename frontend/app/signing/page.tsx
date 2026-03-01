"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SignaturePad from 'signature_pad';
import { Eraser, Check, ChevronLeft, RotateCcw, FileSignature } from 'lucide-react';
import "@/app/styles/components.css";

function SigningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = searchParams.get('id') || 'DOC-UNKNOWN';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // เริ่มต้น Signature Pad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && containerRef.current) {
      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)', // โปร่งใส
        penColor: 'rgb(15, 23, 42)',               // สีดำอมน้ำเงิน (Slate 900)
        minWidth: 2,                               // เส้นบางสุด
        maxWidth: 5,                               // เส้นหนาสุด (ตามแรงกดนิ้ว)
      });
      signaturePadRef.current = signaturePad;

      // ปรับขนาด Canvas ให้คมชัด ไม่เบลอ
      const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        // วัดขนาดจากกล่อง Container แม่
        canvas.width = containerRef.current!.offsetWidth * ratio;
        canvas.height = containerRef.current!.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        signaturePad.clear(); 
      };

      window.addEventListener("resize", resizeCanvas);
      resizeCanvas(); // เรียกครั้งแรกตอนโหลดหน้า

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        signaturePad.off();
      };
    }
  }, []);

  const handleClear = () => signaturePadRef.current?.clear();

  const handleUndo = () => {
    const data = signaturePadRef.current?.toData();
    if (data && data.length > 0) {
      data.pop(); // ลบเส้นสุดท้าย
      signaturePadRef.current?.fromData(data);
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current?.isEmpty()) {
      alert("กรุณาเซ็นชื่อก่อนกดยืนยันครับ");
      return;
    }
    // แปลงลายเซ็นเป็นรูปภาพ (Base64)
    const dataURL = signaturePadRef.current?.toDataURL("image/png");
    console.log("ส่งข้อมูลลายเซ็นไปให้ CNC:", dataURL);
    
    alert("บันทึกลายเซ็นเรียบร้อย! ระบบกำลังสั่งการเครื่อง CNC...");
    router.push('/dashboard'); // กลับหน้าหลัก
  };

  return (
    <div className="h-screen w-full bg-[#F9FAFB] flex flex-col overflow-hidden">
      
      {/* --- Header --- */}
      <div className="bg-white border-b-2 border-gray-100 p-3 pi:p-4 shrink-0 flex items-center justify-between z-20 shadow-sm">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-1 pi:gap-2 text-gray-500 hover:text-[#4F46E5] font-bold text-sm pi:text-xl transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50"
        >
          <ChevronLeft className="w-5 h-5 pi:w-8 pi:h-8" /> ย้อนกลับ
        </button>
        
        <h1 className="text-xl pi:text-3xl font-bold text-gray-800 flex items-center gap-2">
           <FileSignature className="text-[#4F46E5] w-6 h-6 pi:w-8 pi:h-8" />
           ลงนามเอกสาร: <span className="text-[#4F46E5]">{docId}</span>
        </h1>
        
        <div className="w-20"></div> {/* Spacer ดันให้ข้อความอยู่ตรงกลาง */}
      </div>

      {/* --- Main Layout (Split Screen) --- */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* LEFT: Document Preview (ฝั่งซ้าย: ดูเอกสาร) */}
        <div className="flex-1 bg-gray-200 overflow-y-auto p-4 pi:p-8 flex justify-center custom-scrollbar shadow-inner">
          {/* กระดาษ A4 จำลอง */}
          <div className="bg-white shadow-xl w-full max-w-[800px] min-h-[1131px] p-10 pi:p-16 relative">
            
            <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 pi:w-28 pi:h-28 bg-gray-800 rounded-full mb-6 flex items-center justify-center text-white font-bold">LOGO</div>
                <h2 className="text-3xl pi:text-4xl font-bold text-gray-800">บันทึกข้อความ</h2>
            </div>

            <div className="space-y-6 text-gray-800 text-lg pi:text-2xl leading-relaxed">
                <p><strong>ส่วนราชการ:</strong> ภาควิชาวิศวกรรมคอมพิวเตอร์</p>
                <p><strong>เรื่อง:</strong> ขออนุมัติใช้ระบบลงนามทางไกล (Secure Remote Signature)</p>
                <hr className="border-gray-300 my-6" />
                <p className="indent-16 text-justify">
                    ด้วยข้าพเจ้า นายสมชาย อาจหาญ ตำแหน่งผู้บริหารระดับสูง มีความประสงค์จะใช้งานระบบเครื่องลงนามอัตโนมัติ (CNC Plotter) 
                    เพื่ออำนวยความสะดวกในการลงนามเอกสารราชการจากระยะไกล โดยผ่านระบบเครือข่ายอินเทอร์เน็ตที่ปลอดภัย
                </p>
                <p className="indent-16 text-justify">
                    จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ และสั่งการให้เจ้าหน้าที่ที่เกี่ยวข้องดำเนินการในส่วนที่เกี่ยวข้องต่อไป
                </p>
                
                <div className="mt-32 flex flex-col items-end pr-10">
                     <p className="mb-8">ขอแสดงความนับถือ</p>
                     
                     {/* จุดที่จะให้ CNC ไปวาดลายเซ็น (เว้นว่างไว้) */}
                     <div className="relative py-4 px-10 border-2 border-dashed border-indigo-200 bg-indigo-50/50 min-w-[300px] text-center rounded-xl mb-4">
                        <span className="text-indigo-400 font-medium text-base pi:text-xl">( ลายเซ็นจะปรากฏบริเวณนี้ )</span>
                     </div>

                     <p className="font-bold">( นายสมชาย อาจหาญ )</p>
                     <p className="text-gray-600">ผู้บริหารระดับสูง</p>
                </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Signature Pad Panel (ฝั่งขวา: พื้นที่เซ็นชื่อ) */}
        <div className="w-[40%] min-w-[350px] pi:min-w-[450px] max-w-[500px] bg-white border-l-2 border-gray-200 shadow-2xl flex flex-col z-10">
          
          <div className="p-4 pi:p-6 bg-indigo-50 border-b border-indigo-100 flex flex-col items-center text-center">
             <h3 className="text-xl pi:text-3xl font-bold text-indigo-800 mb-1">พื้นที่ลงนาม</h3>
             <p className="text-sm pi:text-lg text-indigo-500 font-medium">ใช้นิ้วหรือปากกาเซ็นชื่อลงในกรอบด้านล่าง</p>
          </div>

          {/* Canvas Container (touch-none ป้องกันจอเลื่อนเวลาเขียน) */}
          <div ref={containerRef} className="flex-1 bg-white relative cursor-crosshair touch-none"> 
            <canvas ref={canvasRef} className="w-full h-full block" />
            
            {/* ข้อความลายน้ำจางๆ */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <FileSignature className="w-48 h-48 pi:w-64 pi:h-64" />
            </div>
          </div>

          {/* Tools / Buttons */}
          <div className="p-4 pi:p-6 border-t-2 border-gray-100 bg-gray-50 flex flex-col gap-3 pi:gap-4">
             <div className="flex gap-3">
                <button 
                    onClick={handleUndo}
                    className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-gray-700 py-3 pi:py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-base pi:text-xl font-bold active:scale-95"
                >
                    <RotateCcw className="w-5 h-5 pi:w-7 pi:h-7" /> ย้อนกลับ
                </button>
                <button 
                    onClick={handleClear}
                    className="flex-1 bg-white border-2 border-gray-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50 text-gray-700 py-3 pi:py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-base pi:text-xl font-bold active:scale-95"
                >
                    <Eraser className="w-5 h-5 pi:w-7 pi:h-7" /> ล้างใหม่
                </button>
             </div>

             <button 
                onClick={handleSave}
                className="w-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold py-4 pi:py-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95 text-lg pi:text-2xl mt-2"
             >
                <Check className="w-6 h-6 pi:w-8 pi:h-8" /> ยืนยันและสั่งเครื่องลงนาม
             </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function SigningPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#F9FAFB]">
        <div className="text-2xl font-bold text-[#4F46E5] animate-pulse">กำลังโหลดเอกสาร...</div>
      </div>
    }>
      <SigningContent />
    </Suspense>
  );
}