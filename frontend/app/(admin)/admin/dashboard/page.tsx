"use client";

import { Shield, FileCheck, Users, Activity } from "lucide-react";

const cards = [
  {
    title: "คำขอรอตรวจสอบ",
    value: "0",
    icon: FileCheck,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "ผู้ใช้ในระบบ",
    value: "0",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "งานที่กำลังดำเนินการ",
    value: "0",
    icon: Activity,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function AdminDashboardPage() {
  return (
    <section className="min-h-full bg-linear-to-b from-[#EEF2FF] to-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-indigo-100 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">พื้นที่สำหรับจัดการระบบและตรวจสอบสถานะงานรวม</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
