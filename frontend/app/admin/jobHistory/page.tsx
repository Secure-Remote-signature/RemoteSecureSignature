"use client";
import React, { useState } from "react";

interface JobRecord {
  id: string;
  timestamp: string;
  requester: string;
  signer: string;
  faculty: string;
  targetDevice: string;
  status: "COMPLETED" | "FAILED" | "PROCESSING" | "WAITING" | "CANCELLED";
  duration: string;
  errorMessage?: string;
  coordinatesHash: string;
}

const mockJobs: JobRecord[] = [
  { id: "JOB-1045", timestamp: "2026-03-27 11:05:22", requester: "สมหญิง ใจดี", signer: "สมชาย อาจหาญ", faculty: "Engineering", targetDevice: "PLT-ENG", status: "PROCESSING", duration: "00:45", coordinatesHash: "a8f5f167f44f..." },
  { id: "JOB-1044", timestamp: "2026-03-27 10:50:10", requester: "สายสมร แสนสุข", signer: "Test Dev", faculty: "Science", targetDevice: "PLT-SCI", status: "COMPLETED", duration: "02:15", coordinatesHash: "b9x2c109d31a..." },
    { id: "JOB-1043", timestamp: "2026-03-27 10:45:00", requester: "นิรันดร์ ก่อนกาล", signer: "ยงยุทธ ยิ่งยวด", faculty: "Engineering", targetDevice: "PLT-ENG", status: "COMPLETED", duration: "01:50", coordinatesHash: "c7y4a982e11b..." },
  { id: "JOB-1042", timestamp: "2026-03-27 10:30:05", requester: "จิราภรณ์ สุขใจ", signer: "ยอดเยี่ยม ยิ่งใหญ่", faculty: "Business", targetDevice: "PLT-BUS", status: "FAILED", duration: "00:12", errorMessage: "Pen connection lost / Hardware timeout", coordinatesHash: "d5z1b883f00c..." },
  { id: "JOB-1041", timestamp: "2026-03-27 10:15:30", requester: "สุรชัย สอนดี", signer: "เกรียงไกร ตลอดกาล", faculty: "Science", targetDevice: "PLT-SCI", status: "CANCELLED", duration: "-", errorMessage: "Cancelled by Requester", coordinatesHash: "e3w9d774g22d..." },
];

export default function JobHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);

  const filteredJobs = mockJobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      job.id.toLowerCase().includes(searchLower) || 
      job.requester.toLowerCase().includes(searchLower) ||
      job.signer.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PROCESSING": return "bg-amber-50 text-amber-700 border-amber-200";
      case "WAITING": return "bg-blue-50 text-blue-700 border-blue-200";
      case "FAILED": return "bg-rose-50 text-rose-700 border-rose-200";
      case "CANCELLED": return "bg-gray-100 text-gray-600 border-gray-300";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ประวัติคิวงาน (Job History)</h1>
            <p className="text-sm text-gray-500 mt-1">ตรวจสอบประวัติการส่งคำร้องและการลงนามทั้งหมด</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white min-w-37.5"
            >
              <option value="ALL">ทุกสถานะ (All)</option>
              <option value="COMPLETED">สำเร็จ (Completed)</option>
              <option value="PROCESSING">กำลังทำงาน (Processing)</option>
              <option value="WAITING">รอคิว (Waiting)</option>
              <option value="FAILED">ล้มเหลว (Failed)</option>
              <option value="CANCELLED">ยกเลิก (Cancelled)</option>
            </select>

            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="ค้นหา Job ID, ผู้ส่งคำร้อง, หรือผู้ลงนาม..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm text-sm whitespace-nowrap">
              Export CSV
            </button>
          </div>
        </div>

        {/* --- Job Table --- */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Job ID / เวลา</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">ผู้ส่งคำร้อง (Requester)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">ผู้ลงนาม (Signer)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">เครื่อง (คณะ)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">สถานะ</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-700">{job.id}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{job.timestamp}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{job.requester}</td>
                    <td className="px-6 py-4 text-sm text-indigo-700 font-semibold">{job.signer}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 font-semibold">{job.targetDevice}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{job.faculty}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getStatusStyle(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedJob(job)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                      >
                        ดูข้อมูล
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                      ไม่พบประวัติงานที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Job Details Modal --- */}
        {selectedJob && (
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedJob(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">ข้อมูลงานเซ็น</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedJob.id}</p>
                </div>
                <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
              </div>
              
              <div className="p-6 space-y-4 text-sm text-gray-700">
                <div className="grid grid-cols-3 gap-y-3 gap-x-2">
                  <div className="font-semibold text-gray-500">ผู้ส่งคำร้อง:</div>
                  <div className="col-span-2 font-medium">{selectedJob.requester}</div>

                  <div className="font-semibold text-gray-500">ผู้ลงนาม:</div>
                  <div className="col-span-2 font-semibold text-indigo-700">{selectedJob.signer}</div>
                  
                  <div className="font-semibold text-gray-500">เป้าหมาย:</div>
                  <div className="col-span-2">{selectedJob.targetDevice} ({selectedJob.faculty})</div>

                  <div className="font-semibold text-gray-500">เวลาที่บันทึก:</div>
                  <div className="col-span-2">{selectedJob.timestamp}</div>

                  <div className="font-semibold text-gray-500">เวลาที่ใช้:</div>
                  <div className="col-span-2">{selectedJob.duration}</div>
                  
                  <div className="font-semibold text-gray-500">สถานะ:</div>
                  <div className="col-span-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border inline-block ${getStatusStyle(selectedJob.status)}`}>
                      {selectedJob.status}
                    </span>
                  </div>

                  {selectedJob.status === "FAILED" && selectedJob.errorMessage && (
                    <>
                      <div className="font-semibold text-rose-500 mt-2">สาเหตุที่ล้มเหลว:</div>
                      <div className="col-span-2 text-rose-600 mt-2 font-medium">{selectedJob.errorMessage}</div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-4">
                  <div className="font-semibold text-gray-500 mb-2">ข้อมูลอ้างอิงความปลอดภัย (Integrity Check):</div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Coordinates Hash (SHA-256):</p>
                    <p className="font-mono text-xs text-gray-700 break-all bg-white p-2 rounded border border-gray-200">
                      {selectedJob.coordinatesHash}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 mt-2">
                  {selectedJob.status === "FAILED" && (
                     <button className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 font-medium transition-colors text-sm border border-indigo-200">
                       ลองส่งคำสั่งใหม่ (Retry)
                     </button>
                  )}
                  <button 
                    onClick={() => setSelectedJob(null)} 
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors text-sm"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}