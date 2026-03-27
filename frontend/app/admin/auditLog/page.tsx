"use client";

import React, { useState } from "react";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: "SIGN_REQUEST" | "LOGIN" | "ADMIN_UPDATE" | "E_STOP";
  targetDevice?: string;
  ipAddress: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
  details: string;
}

const mockLogs: AuditLog[] = [
  { id: "LOG-9042", timestamp: "2026-03-27 10:45:12", user: "somchai@example.com", action: "SIGN_REQUEST", targetDevice: "PLT-ENG", ipAddress: "192.168.1.45", status: "SUCCESS", details: "Signature Job JOB-1045 queued successfully." },
  { id: "LOG-9041", timestamp: "2026-03-27 10:30:05", user: "test@example.com", action: "SIGN_REQUEST", targetDevice: "PLT-SCI", ipAddress: "192.168.1.112", status: "FAILED", details: "Access Denied: User faculty (Business) does not match target device (Science)." },
  { id: "LOG-9040", timestamp: "2026-03-27 09:15:00", user: "admin@example.com", action: "ADMIN_UPDATE", ipAddress: "10.0.0.5", status: "SUCCESS", details: "Granted cross-faculty access (Science) to somchai@example.com" },
  { id: "LOG-9039", timestamp: "2026-03-27 08:50:22", user: "admin@example.com", action: "E_STOP", targetDevice: "PLT-ENG", ipAddress: "10.0.0.5", status: "WARNING", details: "Emergency stop triggered by Administrator." },
  { id: "LOG-9038", timestamp: "2026-03-27 08:00:15", user: "sudha@example.com", action: "LOGIN", ipAddress: "172.16.0.44", status: "SUCCESS", details: "User logged in successfully via Web." },
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = mockLogs.filter(log => 
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionStyle = (action: string) => {
    switch (action) {
      case "SIGN_REQUEST": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ADMIN_UPDATE": return "bg-purple-50 text-purple-700 border-purple-200";
      case "E_STOP": return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      case "LOGIN": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS": return "text-emerald-600 font-semibold";
      case "FAILED": return "text-rose-600 font-semibold";
      case "WARNING": return "text-amber-600 font-semibold";
      default: return "text-gray-600";
    }
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ระบบบันทึกประวัติ (Audit Logs)</h1>
            <p className="text-sm text-gray-500 mt-1">ตรวจสอบกิจกรรมและการเข้าถึงระบบทั้งหมด (Immutable Records)</p>
          </div>
          <div className="w-full sm:w-72 relative">
            <input 
              type="text" 
              placeholder="ค้นหาผู้ใช้, Action, หรือ Log ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Log ID / เวลา</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">ผู้ใช้งาน (User)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">กิจกรรม (Action)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">เป้าหมาย / IP Address</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">สถานะ</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">เพิ่มเติม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-700">{log.id}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{log.timestamp}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{log.user}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getActionStyle(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.targetDevice ? (
                        <div className="text-sm text-gray-700 font-semibold">{log.targetDevice}</div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{log.ipAddress}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={getStatusColor(log.status)}>{log.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                      >
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                      ไม่พบข้อมูล Log ที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLog && (
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">รายละเอียด Log</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedLog.id}</p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
              </div>
              
              <div className="p-6 space-y-4 text-sm text-gray-700">
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-semibold text-gray-500">เวลา (Time):</div>
                  <div className="col-span-2">{selectedLog.timestamp}</div>
                  
                  <div className="font-semibold text-gray-500">ผู้ทำรายการ:</div>
                  <div className="col-span-2 font-medium">{selectedLog.user}</div>
                  
                  <div className="font-semibold text-gray-500">IP Address:</div>
                  <div className="col-span-2 font-mono">{selectedLog.ipAddress}</div>
                  
                  <div className="font-semibold text-gray-500">สถานะ:</div>
                  <div className="col-span-2"><span className={getStatusColor(selectedLog.status)}>{selectedLog.status}</span></div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="font-semibold text-gray-500 mb-2">รายละเอียด (Payload / Reason):</div>
                  <div className="bg-slate-800 text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                    {selectedLog.details}
                    {selectedLog.action === "SIGN_REQUEST" && (
                      <div className="mt-2 text-gray-400">
                        {`\n> Coordinates Hash: a8f5f167f44f4964e...`}
                        {`\n> Verify Signature: PASS`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={() => setSelectedLog(null)} 
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