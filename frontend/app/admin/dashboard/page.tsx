"use client";

import React from "react";
import { useRouter } from "next/navigation";

const overallStats = {
  totalQueue: 6,
  completedToday: 128,
  failedToday: 2,
};

const plotters = [
  { id: "PLT-ENG", name: "Engineering Plotter", faculty: "Engineering", status: "BUSY", queue: 5, currentJob: "JOB-1045" },
  { id: "PLT-SCI", name: "Science Plotter", faculty: "Science", status: "ONLINE", queue: 0, currentJob: null },
  { id: "PLT-BUS", name: "Business Plotter", faculty: "Business", status: "OFFLINE", queue: 0, currentJob: null },
  { id: "PLT-MED", name: "Medicine Plotter", faculty: "Medicine", status: "ONLINE", queue: 1, currentJob: null },
];

const recentJobs = [
  { id: "JOB-1045", user: "อาจารย์ สมชาย", signatory: "อาจารย์ ใจดี", faculty: "Engineering", machine: "PLT-ENG", time: "11:05 AM", status: "PROCESSING" },
  { id: "JOB-1044", user: "admin@example.com", signatory: "admin@example.com", faculty: "Science", machine: "PLT-SCI", time: "10:50 AM", status: "COMPLETED" },
  { id: "JOB-1043", user: "student1@example.com", signatory: "student1@example.com", faculty: "Engineering", machine: "PLT-ENG", time: "10:45 AM", status: "COMPLETED" },
  { id: "JOB-1042", user: "test@example.com", signatory: "test@example.com", faculty: "Business", machine: "PLT-BUS", time: "10:30 AM", status: "FAILED" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ONLINE":
      case "COMPLETED":
        return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", ping: "bg-emerald-400" };
      case "BUSY":
      case "PROCESSING":
        return { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", ping: "bg-amber-400" };
      case "OFFLINE":
      case "FAILED":
        return { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500", ping: null };
      default:
        return { color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", dot: "bg-gray-400", ping: null };
    }
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ (Multi-Device Dashboard)</h1>
            <p className="text-sm text-gray-500 mt-1">มอนิเตอร์สถานะเครื่อง CNC Plotter ทุกคณะแบบ Real-time</p>
          </div>
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            รีเฟรชข้อมูล
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">คิวรวมที่รอเซ็น</p>
              <h3 className="text-3xl font-bold text-indigo-600">{overallStats.totalQueue}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">เซ็นสำเร็จ (วันนี้)</p>
              <h3 className="text-3xl font-bold text-emerald-600">{overallStats.completedToday}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">ข้อผิดพลาด</p>
              <h3 className="text-3xl font-bold text-rose-600">{overallStats.failedToday}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-800 pt-2">สถานะฮาร์ดแวร์ประจำคณะ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plotters.map((plotter) => {
            const style = getStatusStyle(plotter.status);
            return (
              <div key={plotter.id} className={`bg-white rounded-2xl border ${style.border} shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md`}>
                <div className={`px-5 py-3 border-b ${style.border} ${style.bg} flex justify-between items-center`}>
                  <div className="flex items-center gap-2">
                    {/* ไฟสถานะกระพริบ */}
                    <span className="relative flex h-2.5 w-2.5">
                      {style.ping && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.ping}`}></span>}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`}></span>
                    </span>
                    <span className={`text-xs font-bold tracking-wider ${style.color}`}>{plotter.status}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">{plotter.faculty}</span>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{plotter.name}</h3>
                  <p className="text-xs text-gray-400 mb-4 font-mono">{plotter.id}</p>
                  
                  <div className="mt-auto space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">คิวที่รอ (Queue):</span>
                      <span className="font-semibold text-gray-800">{plotter.queue}</span>
                    </div>
                    {plotter.currentJob ? (
                      <div className="flex justify-between items-center text-sm bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                        <span className="text-indigo-600 font-medium">กำลังทำ:</span>
                        <span className="font-bold text-indigo-700">{plotter.currentJob}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-gray-500">กำลังทำ:</span>
                        <span className="text-gray-400">- ว่าง -</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">คิวงานล่าสุด</h2>
            <button 
              onClick={() => router.push('/admin/jobHistory')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors" >
              ดูประวัติทั้งหมด
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Job ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">ผู้สร้างคำร้อง</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">ผู้ลงนาม</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">เครื่องเป้าหมาย (คณะ)</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">เวลา</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => {
                  const style = getStatusStyle(job.status);
                  return (
                    <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0">
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{job.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{job.user}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="font-medium">{job.signatory}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="font-medium">{job.machine}</span>
                        <span className="text-xs text-gray-400 ml-1">({job.faculty})</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{job.time}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border ${style.border} ${style.bg} ${style.color}`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}