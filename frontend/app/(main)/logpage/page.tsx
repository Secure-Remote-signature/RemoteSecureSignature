"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Search, FileText, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import "@/app/styles/components.css";
import api from '@/app/lib/api';

type UiStatus = 'success' | 'failed' | 'processing';

type HistoryRow = {
  requestId: number;
  requestNumber: string;
  requestSubject: string | null;
  requestMessage: string;
  requestDate: string;
  requestStatus: string;
  requestRTSP: string | null;
  requestPicture: string | null;
  signatureCoordinates: string | null;
  rejectReason: string | null;
  ownerName: string | null;
  ownerLastName: string | null;
  createdAt: string | null;
  claimedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stateVersion: number | null;
  studentName: string | null;
  studentLastName: string | null;
};

type LogItem = {
  id: string;
  docName: string;
  sender: string;
  date: string;
  status: UiStatus;
  rawStatus: string;
  requestNumber: string;
  requestRTSP: string;
  ownerName: string;
  createdAt: string;
  claimedAt: string;
  startedAt: string;
  completedAt: string;
  stateVersion: string;
  requestPicture: string | null;
  signatureCoordinates: string | null;
  rejectReason: string;
};

function mapStatusToUi(status?: string): UiStatus {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'signed') return 'success';
  if (normalized === 'rejected') return 'failed';
  return 'processing';
}

function formatDate(isoText?: string): string {
  if (!isoText) return '-';
  const dt = new Date(isoText);
  if (Number.isNaN(dt.getTime())) return isoText;

  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export default function HistoryLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError('');
        const rawSession = sessionStorage.getItem('user_session');
        if (!rawSession) {
          throw new Error('ไม่พบ session ผู้ใช้');
        }

        const session = JSON.parse(rawSession);
        const userId = session?.id;
        if (!userId) {
          throw new Error('ไม่พบ user id ใน session');
        }

        const url = `${process.env.NEXT_PUBLIC_API_URL}/srs/request/history/${userId}?limit=100`;
        const res = await api.get(url);
        const rows = (res.data || []) as HistoryRow[];

        const mapped: LogItem[] = rows.map((row) => {
          const sender = [row.studentName || '', row.studentLastName || ''].join(' ').trim() || '-';
          return {
            id: `REQ-${row.requestId}`,
            docName: row.requestSubject || row.requestMessage || row.requestNumber || '-',
            sender,
            date: formatDate(row.requestDate),
            status: mapStatusToUi(row.requestStatus),
            rawStatus: row.requestStatus || '-',
            requestNumber: row.requestNumber || '-',
            requestRTSP: row.requestRTSP || '-',
            ownerName: [row.ownerName || '', row.ownerLastName || ''].join(' ').trim() || '-',
            createdAt: formatDate(row.createdAt || undefined),
            claimedAt: formatDate(row.claimedAt || undefined),
            startedAt: formatDate(row.startedAt || undefined),
            completedAt: formatDate(row.completedAt || undefined),
            stateVersion: row.stateVersion !== null && row.stateVersion !== undefined ? String(row.stateVersion) : '-',
            requestPicture: row.requestPicture || null,
            signatureCoordinates: row.signatureCoordinates || null,
            rejectReason: (row.rejectReason || '').trim(),
          };
        });

        setLogs(mapped);
      } catch (err) {
        console.error('โหลดประวัติไม่สำเร็จ', err);
        setError('โหลดประวัติไม่สำเร็จ');
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim();
    if (!q) return logs;
    return logs.filter((log) =>
      log.docName.includes(q) ||
      log.sender.includes(q) ||
      log.id.includes(q)
    );
  }, [logs, searchTerm]);

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

  const drawPreviewToCanvas = async (canvas: HTMLCanvasElement, log: LogItem) => {
    if (!log.requestPicture) {
      throw new Error('ไม่พบไฟล์เอกสาร');
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/uploads/${log.requestPicture}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('โหลดรูปเอกสารไม่สำเร็จ'));
      img.src = imageUrl;
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('ไม่สามารถแสดงพรีวิวได้');
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    let paths: Array<Array<{ x: number; y: number }>> = [];
    if (log.signatureCoordinates) {
      try {
        const parsed = JSON.parse(log.signatureCoordinates);
        if (Array.isArray(parsed)) {
          paths = parsed;
        }
      } catch {
        paths = [];
      }
    }

    if (paths.length > 0) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineCap = 'round';
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const path of paths) {
        if (!Array.isArray(path) || path.length < 2) continue;
        ctx.beginPath();
        const first = path[0];
        ctx.moveTo(Number(first.x), Number(first.y));
        minX = Math.min(minX, Number(first.x));
        minY = Math.min(minY, Number(first.y));
        maxX = Math.max(maxX, Number(first.x));
        maxY = Math.max(maxY, Number(first.y));

        for (let i = 1; i < path.length; i += 1) {
          const p = path[i];
          ctx.lineTo(Number(p.x), Number(p.y));
          minX = Math.min(minX, Number(p.x));
          minY = Math.min(minY, Number(p.y));
          maxX = Math.max(maxX, Number(p.x));
          maxY = Math.max(maxY, Number(p.y));
        }
        ctx.stroke();
      }

      if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
        const pad = 14;
        ctx.save();
        ctx.setLineDash([12, 8]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#EF4444';
        ctx.strokeRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
        ctx.restore();
      }
    }
  };

  const SignedPreviewModal = ({ log, onClose }: { log: LogItem; onClose: () => void }) => {
    const [isDrawing, setIsDrawing] = useState(true);
    const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
      let cancelled = false;
      const run = async () => {
        if (!canvasRef) return;
        try {
          setPreviewError('');
          setIsDrawing(true);
          await drawPreviewToCanvas(canvasRef, log);
        } catch (e) {
          if (!cancelled) {
            setPreviewError((e as Error).message || 'เปิดพรีวิวไม่สำเร็จ');
          }
        } finally {
          if (!cancelled) setIsDrawing(false);
        }
      };

      run();
      return () => {
        cancelled = true;
      };
    }, [canvasRef, log]);

    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm pi:text-base text-gray-700">
              {log.docName} | สถานะ: <span className="font-bold">{log.rawStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => setZoom((v) => Math.max(0.2, Number((v - 0.1).toFixed(2))))}
              >
                -
              </button>
              <div className="text-xs font-bold text-slate-600 min-w-14 text-center">{Math.round(zoom * 100)}%</div>
              <button
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => setZoom((v) => Math.min(4, Number((v + 0.1).toFixed(2))))}
              >
                +
              </button>
              <button
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => setZoom(1)}
              >
                100%
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700" onClick={onClose}>ปิด</button>
            </div>
          </div>

          <div className="px-4 py-2.5 border-b bg-slate-50 text-xs pi:text-sm text-slate-700 leading-6">
            <div>เลขเอกสาร: <span className="font-semibold">{log.requestNumber}</span> | ผู้ลงนาม: <span className="font-semibold">{log.ownerName}</span> | ผู้ส่ง: <span className="font-semibold">{log.sender}</span></div>
            <div>สร้าง: {log.createdAt} | เริ่มเซ็น: {log.startedAt} | เซ็นเสร็จ: {log.completedAt} | RTSP: {log.requestRTSP} | version: {log.stateVersion}</div>
            {log.status === 'failed' && (
              <div className="text-red-700">เหตุผลที่ปฏิเสธ: <span className="font-semibold">{log.rejectReason || '-'}</span></div>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-slate-900/95 p-4">
            {isDrawing && <div className="text-slate-200">กำลังโหลดพรีวิว...</div>}
            {previewError && <div className="text-red-300">{previewError}</div>}
            <div className="inline-block origin-top-left" style={{ transform: `scale(${zoom})` }}>
              <canvas ref={setCanvasRef} className="max-w-full h-auto mx-auto bg-white rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    {/* ปรับ Layout เป็น Flex Column เต็มจอ พื้นหลังขาวสะอาด */}
    <div className="w-full h-full flex flex-col bg-white">
      
      {/* --- ส่วนหัว (Header) แบบ Minimal --- */}
      <div className="flex flex-col gap-3 pi:flex-row items-start pi:items-center justify-between p-3 pi:p-2 border-b-2 border-gray-100 bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700">
                <FileText className="w-8 h-8 pi:w-5 pi:h-5 2xl:w-8 2xl:h-8" />
            </div>
            <div>
                <h1 className="pi:text-[20px] 2xl:text-[32px] font-bold text-gray-800">ประวัติการลงนาม</h1>
                <p className="text-gray-500 text-sm">System Logs</p>
            </div>
        </div>
        <div className="relative w-full pi:w-64 2xl:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="2xl:h-6 2xl:w-6 pi:h-4 pi:w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาเอกสาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pi:text-[16px] 2xl:text-[20px] block w-full pl-10 pi:pl-8 pi:py-2 2xl:pl-12 2xl:pr-4 2xl:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50"
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
              <th className="pl-4 px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">รหัส</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">ชื่อเอกสาร</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">ผู้ส่ง</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] whitespace-nowrap">วัน-เวลา</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] text-center whitespace-nowrap">สถานะ</th>
              <th className="px-6 py-3 font-bold text-gray-600 pi:text-[16px] 2xl:text-[20px] text-center whitespace-nowrap">ดู</th>
            </tr>
          </thead>
          
          {/* เนื้อหาตาราง */}
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center text-gray-500">
                  กำลังโหลดประวัติ...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                // ใช้ odd:bg-white even:bg-gray-50 (Zebra Striping) เพื่อให้อ่านง่าย
                <tr key={log.id} className="odd:bg-white even:bg-slate-50 hover:bg-indigo-50 transition-colors">
                  <td className="pl-4 px-3 py-3 text-gray-500 pi:text-[16px] 2xl:text-[20px] font-mono whitespace-nowrap">
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
                  <td className="px-6 py-3">
                    <div className="flex flex-col items-center gap-1">
                      {renderStatusBadge(log.status)}
                      {log.status === 'failed'}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button 
                      onClick={() => setSelectedLog(log)}
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

      {selectedLog && (
        <SignedPreviewModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
}