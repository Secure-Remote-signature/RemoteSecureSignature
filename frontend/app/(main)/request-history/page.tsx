"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, Search, XCircle } from 'lucide-react';
import api from '@/app/lib/api';
import "@/app/styles/components.css";

type UiStatus = 'success' | 'failed' | 'processing';

type RequestHistoryRow = {
  requestId: number;
  requestNumber: string;
  requestSubject: string | null;
  requestMessage: string;
  requestDate: string;
  requestStatus: string;
  requestPicture: string | null;
  signatureCoordinates: string | null;
  ownerName: string | null;
  ownerLastName: string | null;
  rejectReason: string | null;
};

type RequestHistoryItem = {
  id: string;
  title: string;
  receiver: string;
  createdAt: string;
  status: UiStatus;
  rawStatus: string;
  rejectReason: string;
  requestPicture: string | null;
  signatureCoordinates: string | null;
};

type SignaturePoint = { x: number; y: number };
type SignaturePath = SignaturePoint[];

function parseSignaturePaths(raw: string | null): SignaturePath[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((path) => Array.isArray(path))
      .map((path) =>
        path
          .map((point) => ({
            x: Number(point?.x),
            y: Number(point?.y),
          }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      )
      .filter((path) => path.length >= 2);
  } catch {
    return [];
  }
}

function drawSignaturePaths(ctx: CanvasRenderingContext2D, paths: SignaturePath[]) {
  if (paths.length === 0) return;

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const path of paths) {
    if (path.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i += 1) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  }
}

function mapStatusToUi(status?: string): UiStatus {
  const normalized = String(status || '').toLowerCase();
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

export default function RequestHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<RequestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<RequestHistoryItem | null>(null);

  useEffect(() => {
    const fetchRequestHistory = async () => {
      try {
        setLoading(true);
        setError('');

        const rawSession = sessionStorage.getItem('user_session');
        if (!rawSession) {
          throw new Error('ไม่พบ session ผู้ใช้');
        }

        const session = JSON.parse(rawSession);
        const userId = Number(session?.id);
        if (!Number.isInteger(userId) || userId <= 0) {
          throw new Error('ไม่พบ user id ใน session');
        }

        const url = `${process.env.NEXT_PUBLIC_API_URL}/srs/request/history-created/${userId}?limit=200`;
        const res = await api.get(url);
        const rows = (res.data || []) as RequestHistoryRow[];

        const mapped = rows.map((row) => ({
          id: row.requestNumber || `REQ-${row.requestId}`,
          title: row.requestSubject || row.requestMessage || `Request ${row.requestId}`,
          receiver: [row.ownerName || '', row.ownerLastName || ''].join(' ').trim() || '-',
          createdAt: formatDate(row.requestDate),
          status: mapStatusToUi(row.requestStatus),
          rawStatus: row.requestStatus || '-',
          rejectReason: (row.rejectReason || '').trim(),
          requestPicture: row.requestPicture || null,
          signatureCoordinates: row.signatureCoordinates || null,
        }));

        setItems(mapped);
      } catch (err) {
        console.error('โหลดประวัติรีเควสที่สร้างไม่สำเร็จ', err);
        setError('โหลดประวัติรีเควสไม่สำเร็จ');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchRequestHistory();
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.receiver.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const renderStatusBadge = (item: RequestHistoryItem) => {
    if (item.status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
          <CheckCircle2 size={14} /> {item.rawStatus}
        </span>
      );
    }
    if (item.status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">
          <XCircle size={14} /> {item.rawStatus}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
        <Clock size={14} /> {item.rawStatus}
      </span>
    );
  };

  const drawPreviewToCanvas = async (canvas: HTMLCanvasElement, item: RequestHistoryItem) => {
    if (!item.requestPicture) {
      throw new Error('ไม่พบไฟล์เอกสาร');
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/uploads/${item.requestPicture}`;
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

    const paths = parseSignaturePaths(item.signatureCoordinates);
    drawSignaturePaths(ctx, paths);
  };

  const PreviewModal = ({ item, onClose }: { item: RequestHistoryItem; onClose: () => void }) => {
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
          await drawPreviewToCanvas(canvasRef, item);
        } catch (e) {
          if (!cancelled) {
            setPreviewError((e as Error).message || 'เปิดพรีวิวไม่สำเร็จ');
          }
        } finally {
          if (!cancelled) setIsDrawing(false);
        }
      };

      void run();
      return () => {
        cancelled = true;
      };
    }, [canvasRef, item]);

    return (
      <div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm pi:text-base text-gray-700">
              {item.title} | สถานะ: <span className="font-bold">{item.rawStatus}</span>
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
            <div>เลขเอกสาร: <span className="font-semibold">{item.id}</span> | ผู้รับคำร้อง: <span className="font-semibold">{item.receiver}</span> | สร้างเมื่อ: <span className="font-semibold">{item.createdAt}</span></div>
            {item.status === 'failed' && (
              <div className="text-red-700">เหตุผลที่ปฏิเสธ: <span className="font-semibold">{item.rejectReason || '-'}</span></div>
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
    <section className="bg-vibrant-indigo min-h-full p-4 pi:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl p-6 border border-indigo-100">
        <div className="flex flex-col pi:flex-row pi:items-center pi:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-Slate-gray">ประวัติรีเควสที่ฉันสร้าง</h1>
            <p className="text-sm text-gray-500">รายการคำร้องที่คุณเป็นผู้สร้างทั้งหมด</p>
          </div>
          <div className="relative w-full pi:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขคำร้อง / เรื่อง / ผู้รับ"
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="h-56 flex items-center justify-center text-gray-500">กำลังโหลด...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-400">ไม่พบข้อมูลรีเควส</div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex flex-col pi:flex-row pi:items-start pi:justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-Slate-gray">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">เลขคำร้อง: {item.id}</p>
                    <p className="text-xs text-gray-500 mt-1">ผู้รับคำร้อง: {item.receiver}</p>
                    <p className="text-xs text-gray-400 mt-1">สร้างเมื่อ: {item.createdAt}</p>
                    {item.rejectReason ? (
                      <p className="text-xs text-rose-600 mt-1">เหตุผลที่ปฏิเสธ: {item.rejectReason}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <Eye size={14} /> ดูเอกสาร
                    </button>
                    {renderStatusBadge(item)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <PreviewModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </section>
  );
}
