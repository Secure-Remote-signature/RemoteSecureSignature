"use client";

const mockUsers = [
  { id: 1, name: "สมชาย ใจดี", role: "Professor", status: "active" },
  { id: 2, name: "สุดา สอนดี", role: "Staff", status: "active" },
  { id: 3, name: "ผู้ดูแลระบบ", role: "Admin", status: "active" },
];

export default function AdminUsersPage() {
  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้</h1>
          <p className="text-gray-500 mt-1">โครงหน้าเริ่มต้นสำหรับบริหารรายชื่อและสิทธิ์ผู้ใช้</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">ชื่อผู้ใช้</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">บทบาท</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-6 py-4 text-gray-800">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600">{user.role}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
