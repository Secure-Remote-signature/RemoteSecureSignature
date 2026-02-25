"use client";

import React, { useState } from 'react';
import { Search, FileText, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import "@/app/styles/components.css";

// Mock Data
const mockLogs = [
  { id: 'LOG-001', docName: 'เอกสารอนุมัติจบการศึกษา', sender: 'สมหญิง ใจดี', date: '25 ก.พ. 2026 14:30', status: 'success' },
  { id: 'LOG-002', docName: 'ใบขอเบิกงบประมาณโครงการ', sender: 'ฝ่ายการเงิน', date: '25 ก.พ. 2026 10:15', status: 'success' },
  { id: 'LOG-003', docName: 'หนังสือขออนุญาตใช้สถานที่', sender: 'สมชาย รักเรียน', date: '24 ก.พ. 2026 16:45', status: 'failed' },
  { id: 'LOG-004', docName: 'สัญญาจ้างผู้รับเหมา CNC', sender: 'ฝ่ายจัดซื้อ', date: '24 ก.พ. 2026 09:00', status: 'processing' },
  { id: 'LOG-005', docName: 'แบบฟอร์มขอลาพักร้อน', sender: 'มานะ อดทน', date: '23 ก.พ. 2026 11:20', status: 'success' },
  { id: 'LOG-006', docName: 'บันทึกข้อความภายใน', sender: 'ธุรการ', date: '22 ก.พ. 2026 08:30', status: 'success' },
  { id: 'LOG-007', docName: 'เอกสารลาป่วย', sender: 'วิชัย ใจสู้', date: '21 ก.พ. 2026 09:45', status: 'failed' },
];

export default function HistoryLogPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = mockLogs.filter(log => 
    log.docName.includes(searchTerm) || 
    log.sender.includes(searchTerm) || 
    log.id.includes(searchTerm)
  );

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-700 bg-green-100 px-2 py-1.5 rounded-lg font-bold">
            <CheckCircle2 size={20} /> <span>สำเร็จ</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-700 bg-red-100 px-2 py-1.5 rounded-lg font-bold">
            <XCircle size={20} /> <span>ล้มเหลว</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-2 text-orange-700 bg-orange-100 px-2 py-1.5 rounded-lg font-bold">
            <Clock size={20} /> <span>กำลังทำ...</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    // ปรับ Layout เป็น Flex Column เต็มจอ พื้นหลังขาวสะอาด
    <div className="w-full h-full flex flex-col bg-white">
      
      {/* --- ส่วนหัว (Header) แบบ Minimal --- */}
      <div className="flex flex-row items-center justify-between p-2 border-b-2 border-gray-100 bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700">
                <FileText size={32} />
            </div>
            <div>
                <h1 className="pi:text-[20px] 2xl:text-[32px] font-bold text-gray-800">ประวัติการลงนาม</h1>
                <p className="text-gray-500 text-sm">System Logs</p>
            </div>
        </div>
        <div className="relative w-64 2xl:w-96 pi:w-64">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาเอกสาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pi:text-[16px] 2xl:text-[20px] block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50"
          />
        </div>
      </div>

      {/* --- ส่วนตาราง (Table Area) --- */}
      {/* ใช้ flex-1 เพื่อให้ตารางกินพื้นที่ที่เหลือทั้งหมด และ overflow-auto เพื่อให้เลื่อนได้ */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          
          {/* หัวตาราง (Sticky) */}
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">รหัส</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">ชื่อเอกสาร</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">ผู้ส่ง</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">วัน-เวลา</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] text-center whitespace-nowrap">สถานะ</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] text-center whitespace-nowrap">ดู</th>
            </tr>
          </thead>
          
          {/* เนื้อหาตาราง */}
          <tbody className="divide-y divide-gray-200">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                // ใช้ odd:bg-white even:bg-gray-50 (Zebra Striping) เพื่อให้อ่านง่าย
                <tr key={log.id} className="odd:bg-white even:bg-slate-50 hover:bg-indigo-50 transition-colors">
                  <td className="px-3 py-3 text-gray-500 pi:text-[16px] 2xl:text-[20px] font-mono whitespace-nowrap">
                    {log.id}
                  </td>
                  <td className="px-3 py-3 text-gray-900 pi:text-[16px] 2xl:text-[20px] font-semibold whitespace-nowrap">
                    {log.docName}
                  </td>
                  <td className="px-3 py-3 text-gray-700 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">
                    {log.sender}
                  </td>
                  <td className="px-3 py-3 text-gray-500 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">
                    {log.date}
                  </td>
                  <td className="px-6 py-3 flex justify-center">
                    {renderStatusBadge(log.status)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button 
                      onClick={() => alert(`ดูรายละเอียดของ ${log.id}`)}
                      className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors inline-flex items-center justify-center border border-gray-200 hover:border-indigo-200"
                    >
                      <Eye size={28} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center opacity-50">
                    <Search size={64} className="mb-4" />
                    <p className="text-2xl">ไม่พบข้อมูล</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

      {/* Footer (ถ้าต้องการ) */}
      <div className="bg-gray-50 border-t p-1 text-gray-500 flex justify-between items-center pi:text-[12px] 2xl:text-[20px] sticky bottom-0">
         <span>ทั้งหมด: <b>{filteredLogs.length}</b> รายการ</span>
      </div>

    </div>
  );
}