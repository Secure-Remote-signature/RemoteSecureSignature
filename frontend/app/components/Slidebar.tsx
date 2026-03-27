"use client";
import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Settings, LogOut, X, FilePen, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menuItems = useMemo(() => {
    let role = '';
    const session = sessionStorage.getItem('user_session');
    if (session) {
      try {
        role = String(JSON.parse(session)?.role ?? '').toLowerCase();
      } catch {
        role = '';
      }
    }
    const isAdmin = role.includes('admin');
    if (isAdmin) {
      return [
        { name: 'แอดมินแดชบอร์ด', href: '/admin/dashboard', icon: Shield },
        { name: 'จัดการผู้ใช้', href: '/admin/usersManagement', icon: Users },
        { name: 'ประวัติการทำงาน', href: '/admin/auditLog', icon: History },
        { name: 'จัดการเครื่องจักร', href: '/admin/cncManagement', icon: FilePen },
        { name: 'การตั้งค่าระบบ', href: '/admin/systemSetting', icon: Settings },
      ];
    }

    return [
      { name: 'หน้าแรก', href: '/dashboard', icon: Home },
      { name: 'ประวัติการลงนาม', href: '/logpage', icon: History },
      { name: 'การตั้งค่า', href: '/SettingPage', icon: Settings },
      { name: 'คำร้องขอ', href: '/requestpage', icon: FilePen },
    ];
  }, []);
  const handleLogout = () => {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_session");
      sessionStorage.removeItem("auth_notice");
      router.push("/login");
    }
  };
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
        `}
        onClick={onClose}
      />
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
           <h2 className="text-xl font-bold text-indigo-600">Menu</h2>
           <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
             <X size={24} />
           </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}
                `}
              >
                <item.icon size={22} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors font-medium"
            onClick={handleLogout}
          >
            <LogOut size={22} />
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}