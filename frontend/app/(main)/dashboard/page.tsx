"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';
import "@/app/styles/components.css";
import { useRouter } from 'next/navigation';
import api from '@/app/lib/api';
import { subscribeRealtime } from '@/app/lib/realtime';

type DashboardMachineStatus = 'idle' | 'working' | 'offline';
type UiRequestStatus = 'success' | 'failed' | 'processing';

type RequestHistoryRow = {
    requestId: number;
    requestNumber: string;
    requestSubject: string | null;
    requestDate: string;
    requestStatus: string;
};

type RequestHistoryItem = {
    id: string;
    title: string;
    createdAt: string;
    rawStatus: string;
    status: UiRequestStatus;
};

function normalizeDashboardStatus(raw: unknown): DashboardMachineStatus {
    const status = String(raw || '').trim().toLowerCase();
    if (status === 'offline' || status === 'disconnected') return 'offline';
    if (status === 'working' || status === 'busy' || status === 'executing' || status === 'drawing' || status === 'homing' || status === 'running' || status === 'printing' || status === 'signing') {
        return 'working';
    }
    return 'idle';
}

function mapStatusToUi(status?: string): UiRequestStatus {
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

export default function Dashboard() {
    const router = useRouter();
    const [machineStatus, setMachineStatus] = useState<DashboardMachineStatus>('idle');
    const [userId, setUserId] = useState<number | null>(null);
    const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        const savedData = sessionStorage.getItem("user_session");
        if (!savedData) {
            router.push("/login");
            return;
        }
        try {
            const parsed = JSON.parse(savedData);
            const parsedId = Number(parsed?.id);
            if (!Number.isInteger(parsedId) || parsedId <= 0) {
                router.push('/login');
                return;
            }
            setUserId(parsedId);
        } catch (error) {
            console.error("Error parsing user data", error);
            router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/machine/status`);
                if (response.data.status) {
                    setMachineStatus(normalizeDashboardStatus(response.data.status));
                }
            } catch (error) {
                console.error("เชื่อมต่อสถานะเครื่องไม่ได้:", error);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!userId) return;

        const fetchHistory = async () => {
            try {
                setHistoryLoading(true);
                const url = `${process.env.NEXT_PUBLIC_API_URL}/srs/request/history-created/${userId}?limit=5`;
                const res = await api.get(url);
                const rows = (res.data || []) as RequestHistoryRow[];

                const mapped = rows.slice(0, 5).map((row) => ({
                    id: row.requestNumber || `REQ-${row.requestId}`,
                    title: row.requestSubject || `Request ${row.requestNumber || row.requestId}`,
                    createdAt: formatDate(row.requestDate),
                    rawStatus: row.requestStatus || '-',
                    status: mapStatusToUi(row.requestStatus),
                }));

                setRequestHistory(mapped);
            } catch (error) {
                console.error('โหลดประวัติรีเควสไม่สำเร็จ', error);
                setRequestHistory([]);
            } finally {
                setHistoryLoading(false);
            }
        };

        void fetchHistory();
        const interval = setInterval(fetchHistory, 10000);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        const unsubscribe = subscribeRealtime((event) => {
            if (event.type === 'machine.status') {
                const incomingStatus = (event.payload as { status?: unknown } | undefined)?.status;
                setMachineStatus(normalizeDashboardStatus(incomingStatus));
            }
        });

        return unsubscribe;
    }, []);

    const statusBadge = useMemo(() => {
        if (machineStatus === 'idle') {
            return {
                icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
                title: 'ระบบพร้อมใช้งาน',
                subtitle: '(System is ready to use)',
                note: 'เครื่องพร้อมรับงานใหม่',
                tone: 'text-emerald-700',
                box: 'border-emerald-200 bg-emerald-50',
            };
        }
        if (machineStatus === 'working') {
            return {
                icon: <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />,
                title: 'ระบบกำลังทำงาน',
                subtitle: '(Machine is working)',
                note: 'กำลังประมวลผลงานลงนาม',
                tone: 'text-amber-700',
                box: 'border-amber-200 bg-amber-50',
            };
        }
        return {
            icon: <XCircle className="w-12 h-12 text-rose-500" />,
            title: 'เครื่องออฟไลน์',
            subtitle: '(Machine is offline)',
            note: 'กรุณาตรวจสอบการเชื่อมต่อ',
            tone: 'text-rose-700',
            box: 'border-rose-200 bg-rose-50',
        };
    }, [machineStatus]);

    const renderHistoryStatus = (status: UiRequestStatus, rawStatus: string) => {
        if (status === 'success') {
            return <span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">{rawStatus}</span>;
        }
        if (status === 'failed') {
            return <span className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700">{rawStatus}</span>;
        }
        return <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">{rawStatus}</span>;
    };

    return (  
        <div className="bg-vibrant-indigo h-full w-full p-4 pi:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className={`bg-white shadow-2xl rounded-2xl p-6 border ${statusBadge.box}`}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-Slate-gray">สถานะเครื่อง</h2>
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${statusBadge.box} ${statusBadge.tone}`}>
                            {machineStatus.toUpperCase()}
                        </span>
                    </div>
                    <div className="mt-8 flex flex-col items-center text-center gap-3">
                        {statusBadge.icon}
                        <h1 className={`text-2xl font-bold ${statusBadge.tone}`}>{statusBadge.title}</h1>
                        <p className={`text-sm font-medium ${statusBadge.tone}`}>{statusBadge.subtitle}</p>
                        <p className="text-sm text-gray-500">{statusBadge.note}</p>
                    </div>
                </section>

                <section className="bg-white shadow-2xl rounded-2xl p-6 border border-indigo-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-Slate-gray">ประวัติรีเควสล่าสุด</h2>
                        <button
                            onClick={() => router.push('/request-history')}
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                        >
                            ดูเพิ่มเติม
                        </button>
                    </div>

                    {historyLoading ? (
                        <div className="h-56 flex items-center justify-center text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            กำลังโหลดประวัติรีเควส...
                        </div>
                    ) : requestHistory.length === 0 ? (
                        <div className="h-56 flex flex-col items-center justify-center text-gray-400 gap-2">
                            <Clock3 className="w-10 h-10" />
                            <p>ยังไม่มีประวัติรีเควส</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-72 overflow-auto pr-1">
                            {requestHistory.map((item) => (
                                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-Slate-gray">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">{item.id}</p>
                                        <p className="text-xs text-gray-400 mt-1">{item.createdAt}</p>
                                    </div>
                                    {renderHistoryStatus(item.status, item.rawStatus)}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}