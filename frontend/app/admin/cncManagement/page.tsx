"use client";

import React, { useState } from "react";

const devices = [
  { id: "PLT-ENG", name: "Engineering Plotter", faculty: "Engineering", status: "BUSY", currentJob: "JOB-1045", ip: "192.168.1.45" },
  { id: "PLT-SCI", name: "Science Plotter", faculty: "Science", status: "ONLINE", currentJob: null, ip: "192.168.1.112" },
  { id: "PLT-BUS", name: "Business Plotter", faculty: "Business", status: "OFFLINE", currentJob: null, ip: "192.168.1.50" },
];

const mockLiveQueue = [
  { id: "JOB-1046", targetDevice: "PLT-ENG", requester: "student2@example.com", signer: "dean.eng@example.com", addedAt: "11:10 AM" },
  { id: "JOB-1047", targetDevice: "PLT-ENG", requester: "staff_a@example.com", signer: "prof.eng@example.com", addedAt: "11:12 AM" },
  { id: "JOB-1048", targetDevice: "PLT-SCI", requester: "admin@example.com", signer: "prof.sci@example.com", addedAt: "11:15 AM" },
];

export default function CNCManagementPage() {
  const [activeTab, setActiveTab] = useState(devices[0].id);
  const [queue, setQueue] = useState(mockLiveQueue);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const activeDevice = devices.find(d => d.id === activeTab);
  
  const activeQueue = queue.filter(q => q.targetDevice === activeTab);

  const handleEStop = () => {
    if (confirm(`🚨 ยืนยันการสั่งหยุดฉุกเฉิน (E-Stop) เครื่อง ${activeDevice?.name} ใช่หรือไม่?\n\nงานที่กำลังทำอยู่จะถูกยกเลิกทันที!`)) {
      setActionFeedback(`[ส่งคำสั่ง API]: ส่งสัญญาณ E-STOP ไปที่ ${activeDevice?.ip} สำเร็จ`);
    }
  };

  const handleTestPen = () => {
    setActionFeedback(`[ส่งคำสั่ง API]: สั่งทดสอบการลงปากกา (Calibration) ที่เครื่อง ${activeDevice?.name}`);
  };

  const handleGoHome = () => {
    setActionFeedback(`[ส่งคำสั่ง API]: สั่งหัวพิมพ์กลับจุดเริ่มต้น (Homing) ที่เครื่อง ${activeDevice?.name}`);
  };

  const handleRemoveQueue = (jobId: string) => {
    if (confirm(`ยืนยันการลบคิวงาน ${jobId} ใช่หรือไม่?`)) {
      setQueue(queue.filter(q => q.id !== jobId));
      setActionFeedback(`ลบคิวงาน ${jobId} เรียบร้อยแล้ว`);
    }
  };

  const handleMoveToTop = (jobId: string) => {
    const jobToMove = queue.find(q => q.id === jobId);
    if (jobToMove) {
      const otherJobs = queue.filter(q => q.id !== jobId);
      setQueue([jobToMove, ...otherJobs]);
      setActionFeedback(`ย้ายคิว ${jobId} เป็นลำดับแรกเรียบร้อยแล้ว`);
    }
  };

  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
      case "ONLINE": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "BUSY": return "bg-amber-100 text-amber-700 border-amber-200";
      case "OFFLINE": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการเครื่องพิมพ์ (CNC Management)</h1>
          <p className="text-sm text-gray-500 mt-1">ควบคุมฮาร์ดแวร์, การทดสอบระบบ, และจัดการคิวงานแบบ Real-time</p>
        </div>

        {actionFeedback && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
            <div className="flex items-center justify-between gap-3">
              <span>{actionFeedback}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="rounded-md px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
              >
                ปิด
              </button>
            </div>
          </div>
        )}

        <div className="flex overflow-x-auto pb-2 gap-2 snap-x">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => setActiveTab(device.id)}
              className={`snap-start px-5 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center gap-3 border ${
                activeTab === device.id 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${device.status === 'ONLINE' ? 'bg-emerald-400' : device.status === 'BUSY' ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
              {device.name}
            </button>
          ))}
        </div>

        {activeDevice && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">สถานะปัจจุบัน</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">สถานะเครื่อง:</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getStatusStyle(activeDevice.status)}`}>
                      {activeDevice.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">IP Address:</span>
                    <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      {activeDevice.ip}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500 block mb-1">งานที่กำลังดำเนินการ:</span>
                    {activeDevice.currentJob ? (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center">
                        <span className="font-bold text-indigo-700">{activeDevice.currentJob}</span>
                        <span className="text-xs font-semibold text-indigo-500 animate-pulse">กำลังวาด...</span>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                        <span className="text-sm text-gray-400">- ว่าง -</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">คำสั่งควบคุมเครื่อง (Hardware Actions)</h2>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleTestPen}
                    disabled={activeDevice.status === 'BUSY' || activeDevice.status === 'OFFLINE'}
                    className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    ทดสอบการลงปากกา (Test Pen)
                  </button>
                  
                  <button 
                    onClick={handleGoHome}
                    disabled={activeDevice.status === 'BUSY' || activeDevice.status === 'OFFLINE'}
                    className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    รีเซ็ตหัวพิมพ์กลับจุดเริ่มต้น (Home)
                  </button>

                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <button 
                      onClick={handleEStop}
                      className="w-full py-4 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-colors flex justify-center items-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      หยุดฉุกเฉิน (EMERGENCY STOP)
                    </button>
                    <p className="text-xs text-rose-500 text-center mt-2 font-medium">กดเมื่อกระดาษติดหรือเครื่องทำงานผิดปกติเท่านั้น</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">คิวงานที่รอเข้าเครื่อง (Live Queue)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">คิวปัจจุบันของเครื่อง: {activeDevice.name}</p>
                </div>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold border border-indigo-200">
                  รอ {activeQueue.length} คิว
                </span>
              </div>
              
              <div className="overflow-x-auto flex-1">
                {activeQueue.length > 0 ? (
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-white border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ลำดับ</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Job ID</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ผู้ลงนาม (Signer)</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">เวลา</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">จัดการคิว</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {activeQueue.map((job, index) => (
                        <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-700">{job.id}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-indigo-700 font-semibold">{job.signer}</div>
                            <div className="text-xs text-gray-400 mt-0.5">โดย: {job.requester}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{job.addedAt}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {index !== 0 && (
                              <button 
                                onClick={() => handleMoveToTop(job.id)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                                title="ลัดคิวให้เป็นคิวแรก"
                              >
                                ลัดคิว (Skip)
                              </button>
                            )}
                            <button 
                              onClick={() => handleRemoveQueue(job.id)}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            >
                              ยกเลิกงาน
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-75 text-gray-400 space-y-3 p-8">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    <p className="text-sm font-medium">ไม่มีคิวงานค้างสำหรับเครื่องนี้</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}