"use client";
import React, { useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  faculty: string;
  status: string;
}

const mockUsers: User[] = [
  { id: 1, name: "สมชาย ใจดี", email: "somchai@example.com", role: "อาจารย์", faculty: "Engineering", status: "active" },
  { id: 2, name: "สุดา สอนดี", email: "sudha@example.com", role: "เจ้าหน้าที่", faculty: "Science", status: "active" },
  { id: 3, name: "ผู้ดูแลระบบ", email: "admin@example.com", role: "ผู้ดูแลระบบ", faculty: "Business", status: "active" },
];

const inputStyle = `
    w-full
    text-Slate-gray 
    mt-3 
    ring-1 ring-[#C3C5CB] 
    py-3
    2xl:text-[16px] text-[14px]
    2xl:rounded-[50px] rounded-[30px]
    outline-none focus:ring-2 focus:ring-[#4F46E5] 
    transition-all
    pi:px-4 2xl:px-5 px-3
    outline-none 
    focus:ring-2 focus:ring-[#4F46E5] 
    transition-all
  `;
  const primaryBtnStyle = `
    w-full
    bg-[#4F46E5] 
    mt-6 
    text-[#F9FAFB] font-semibold 
    rounded-[30px] 
    p-3 
    hover:opacity-90 hover:shadow-lg transition-all
    pi:text-[16px] 2xl:text-[24px] text-[18px]
  `;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingUser((prev: User | null) => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };

  const handleSave = () => {
    if (editingUser) {
      setUsers((prev) => prev.map((user) => user.id === editingUser.id ? editingUser : user));
      handleCloseModal();
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`คุณต้องการลบผู้ใช้ ${user.name} ใช่หรือไม่?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (editingUser?.id === user.id) {
        handleCloseModal();
      }
    }
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้</h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">ชื่อผู้ใช้</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">อีเมล</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">บทบาท</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">คณะ</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">สถานะ</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">ตั้งค่า</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-6 py-4 text-gray-800">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-gray-600">{user.role}</td>
                  <td className="px-6 py-4 text-gray-600">{user.faculty}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => handleEdit(user)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(user)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Edit Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-Slate-gray mb-4 flex items-center justify-center">แก้ไขผู้ใช้</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-Slate-gray">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  name="name"
                  value={editingUser.name}
                  onChange={handleChange}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">อีเมล</label>
                <input
                  type="email"
                  name="email"
                  value={editingUser.email}
                  onChange={handleChange}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">บทบาท</label>
                <select
                  name="role"
                  value={editingUser.role}
                  onChange={handleChange}
                  className={`${inputStyle}`}
                >
                  <option value="อาจารย์">อาจารย์</option>
                  <option value="เจ้าหน้าที่">เจ้าหน้าที่</option>
                  <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">คณะ</label>
                <select
                  name="faculty"
                  value={editingUser.faculty}
                  onChange={handleChange}
                  className={`${inputStyle}`}
                >
                  <option value="คณะครุศาสตร์">คณะวิศวกรรมศาสตร์</option>
                  <option value="คณะวิทยาศาสตร์">คณะวิทยาศาสตร์</option>
                  <option value="คณะมนุษยศาสตร์">คณะมนุษยศาสตร์</option>
                </select>
              </div>
              <div>
                <button
                  onClick={handleSave}
                  className={`${primaryBtnStyle}`}
                >
                  บันทึก
                </button>
                <button
                  onClick={handleCloseModal}
                  className="text-indigo-600 hover:text-indigo-900 mt-3 w-full py-3 rounded-[30px] border border-gray-300 transition-all text-sm font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
