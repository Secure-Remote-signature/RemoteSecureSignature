"use client";
import React, { useEffect, useMemo, useState } from 'react';
import api, { isAxiosError } from '@/app/lib/api';

interface User {
  userId: number;
  userName: string;
  userLastname: string;
  userEmail: string;
  userRole: string;
  userStatus: string;
  effectiveStatus: string;
  userPhone: string;
  userfacultyId: number;
  facultyName: string;
}

interface AdminUserApi {
  userId: number;
  userName: string;
  userLastname: string;
  userEmail: string;
  userRole: string;
  userStatus?: string;
  effectiveStatus?: string;
  userPhone?: string;
  userfacultyId?: number;
  facultyName?: string;
}

interface Faculty {
  facultyId: number;
  facultyName: string;
}

type UserForm = {
  userName: string;
  userLastname: string;
  userEmail: string;
  userRole: string;
  userPhone: string;
  userfacultyId: string;
  userPassword: string;
  userPin: string;
};

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
  const [users, setUsers] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>({
    userName: '',
    userLastname: '',
    userEmail: '',
    userRole: 'staff',
    userPhone: '',
    userfacultyId: '',
    userPassword: '',
    userPin: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/admin/users`);
      const apiUsers = (res.data?.users ?? []) as AdminUserApi[];

      const mappedUsers: User[] = apiUsers.map((user) => ({
        userId: user.userId,
        userName: user.userName ?? '',
        userLastname: user.userLastname ?? '',
        userEmail: user.userEmail ?? '',
        userRole: user.userRole ?? '-',
        userStatus: String(user.userStatus ?? 'inactive').toLowerCase(),
        effectiveStatus: String(user.effectiveStatus ?? user.userStatus ?? 'inactive').toLowerCase(),
        userPhone: user.userPhone ?? '',
        userfacultyId: Number(user.userfacultyId ?? 0),
        facultyName: user.facultyName ?? '-',
      }));

      setUsers(mappedUsers);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        setErrorMsg(error.response.data?.error || "โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
      } else {
        setErrorMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadFaculties = async () => {
    try {
      const res = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/faculties`);
      setFaculties((res.data ?? []) as Faculty[]);
    } catch (error) {
      console.error('Load faculties error', error);
    }
  };

  useEffect(() => {
    void Promise.all([loadUsers(), loadFaculties()]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      const fullName = `${user.userName} ${user.userLastname}`.toLowerCase();
      return (
        fullName.includes(keyword) ||
        user.userEmail.toLowerCase().includes(keyword) ||
        user.userRole.toLowerCase().includes(keyword) ||
        user.facultyName.toLowerCase().includes(keyword)
      );
    });
  }, [users, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setForm({
      userName: '',
      userLastname: '',
      userEmail: '',
      userRole: 'staff',
      userPhone: '',
      userfacultyId: faculties[0]?.facultyId ? String(faculties[0].facultyId) : '',
      userPassword: '',
      userPin: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('edit');
    setEditingUserId(user.userId);
    setForm({
      userName: user.userName,
      userLastname: user.userLastname,
      userEmail: user.userEmail,
      userRole: user.userRole || 'staff',
      userPhone: user.userPhone || '',
      userfacultyId: String(user.userfacultyId || ''),
      userPassword: '',
      userPin: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setIsSaving(false);
  };

  const handleChangeForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.userName.trim() || !form.userLastname.trim() || !form.userEmail.trim()) {
      setErrorMsg('กรุณากรอกชื่อ นามสกุล และอีเมล');
      return false;
    }

    if (!form.userRole || !form.userfacultyId) {
      setErrorMsg('กรุณาเลือกบทบาทและคณะ');
      return false;
    }

    if (modalMode === 'create') {
      if (!form.userPassword || form.userPassword.length < 6) {
        setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return false;
      }
      if (!/^\d{6}$/.test(form.userPin)) {
        setErrorMsg('PIN ต้องเป็นตัวเลข 6 หลัก');
        return false;
      }
    }

    if (modalMode === 'edit' && form.userPin && !/^\d{6}$/.test(form.userPin)) {
      setErrorMsg('PIN ต้องเป็นตัวเลข 6 หลัก');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setErrorMsg('');
      setIsSaving(true);

      const payload = {
        userName: form.userName.trim(),
        userLastname: form.userLastname.trim(),
        userEmail: form.userEmail.trim(),
        userRole: form.userRole,
        userPhone: form.userPhone.trim(),
        userfacultyId: Number(form.userfacultyId),
        ...(form.userPassword ? { userPassword: form.userPassword } : {}),
        ...(form.userPin ? { userPin: form.userPin } : {}),
      };

      if (modalMode === 'create') {
        await api.post(`${process.env.NEXT_PUBLIC_API_URL}/srs/admin/users`, payload);
      } else if (editingUserId) {
        await api.put(`${process.env.NEXT_PUBLIC_API_URL}/srs/admin/users/${editingUserId}`, payload);
      }

      await loadUsers();
      handleCloseModal();
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        setErrorMsg(error.response.data?.error || 'บันทึกข้อมูลผู้ใช้ไม่สำเร็จ');
      } else {
        setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const fullName = `${user.userName} ${user.userLastname}`.trim();
    if (confirm(`คุณต้องการลบผู้ใช้ ${fullName} ใช่หรือไม่?`)) {
      try {
        setDeletingUserId(user.userId);
        setErrorMsg("");
        await api.delete(`${process.env.NEXT_PUBLIC_API_URL}/srs/admin/users/${user.userId}`);
        setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
        if (editingUserId === user.userId) {
          handleCloseModal();
        }
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response) {
          setErrorMsg(error.response.data?.error || "ลบผู้ใช้ไม่สำเร็จ");
        } else {
          setErrorMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
        }
      } finally {
        setDeletingUserId(null);
      }
    }
  };

  return (
    <section className="min-h-full bg-[#F8FAFC] p-6 pi:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้</h1>

            <div className="flex w-full gap-3 md:w-auto">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ค้นหาชื่อ อีเมล บทบาท หรือคณะ"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 md:w-80"
              />
              <button
                onClick={openCreateModal}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                เพิ่มผู้ใช้
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMsg}
          </div>
        )}

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
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    กำลังโหลดข้อมูลผู้ใช้...
                  </td>
                </tr>
              )}

              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    ไม่พบข้อมูลผู้ใช้
                  </td>
                </tr>
              )}

              {pagedUsers.map((user) => (
                <tr key={user.userId} className="border-t border-gray-100">
                  <td className="px-6 py-4 text-gray-800">{`${user.userName} ${user.userLastname}`.trim()}</td>
                  <td className="px-6 py-4 text-gray-600">{user.userEmail}</td>
                  <td className="px-6 py-4 text-gray-600">{user.userRole}</td>
                  <td className="px-6 py-4 text-gray-600">{user.facultyName}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        user.effectiveStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {user.effectiveStatus === 'active' ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => openEditModal(user)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        disabled={deletingUserId === user.userId}
                        onClick={() => handleDelete(user)}
                      >
                        {deletingUserId === user.userId ? "กำลังลบ..." : "ลบ"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <p>
            แสดง {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            -{Math.min(currentPage * pageSize, filteredUsers.length)} จาก {filteredUsers.length} รายการ
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="px-2">หน้า {currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 p-4 md:p-6 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="mx-auto w-full max-w-md rounded-lg bg-white shadow-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold text-Slate-gray text-center">
                {modalMode === 'create' ? 'เพิ่มผู้ใช้ใหม่' : 'แก้ไขผู้ใช้'}
              </h2>
            </div>

            <div className="px-6 pb-5 pt-3 overflow-y-auto">
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-Slate-gray">ชื่อ</label>
                <input
                  type="text"
                  name="userName"
                  value={form.userName}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">นามสกุล</label>
                <input
                  type="text"
                  name="userLastname"
                  value={form.userLastname}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">อีเมล</label>
                <input
                  type="email"
                  name="userEmail"
                  value={form.userEmail}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">บทบาท</label>
                <select
                  name="userRole"
                  value={form.userRole}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                >
                  <option value="professor">อาจารย์</option>
                  <option value="staff">เจ้าหน้าที่</option>
                  <option value="student">นักศึกษา</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">คณะ</label>
                <select
                  name="userfacultyId"
                  value={form.userfacultyId}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                >
                  <option value="">--- เลือกคณะ ---</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.facultyId} value={faculty.facultyId}>
                      {faculty.facultyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  name="userPhone"
                  value={form.userPhone}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">
                  {modalMode === 'create' ? 'รหัสผ่าน' : 'รหัสผ่านใหม่ (ไม่บังคับ)'}
                </label>
                <input
                  type="password"
                  name="userPassword"
                  value={form.userPassword}
                  onChange={handleChangeForm}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-Slate-gray">
                  {modalMode === 'create' ? 'PIN 6 หลัก' : 'PIN ใหม่ 6 หลัก (ไม่บังคับ)'}
                </label>
                <input
                  type="password"
                  name="userPin"
                  maxLength={6}
                  value={form.userPin}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, '');
                    setForm((prev) => ({ ...prev, userPin: onlyDigits }));
                  }}
                  className={`${inputStyle}`}
                />
              </div>
              <div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`${primaryBtnStyle}`}
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="text-indigo-600 hover:text-indigo-900 mt-3 w-full py-3 rounded-[30px] border border-gray-300 transition-all text-[24px] font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
