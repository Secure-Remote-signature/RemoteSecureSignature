'use client';
import "@/app/styles/components.css"
import { usePathname, useRouter } from 'next/navigation';
export default function Navbar()
{
    const router = useRouter();
    const pathname = usePathname(); // เช็คว่าอยู่หน้าไหน
    const isRegisterPage = pathname === '/register';
     return(
        <div className="h-full w-full flex items-center justify-between px-2 2xl:py-3 pi:py-1 relative z-30 shadow-md">
            <h1 onClick={() => router.push('/')} className="font-black px-2 2xl:px-5 pi:px-3 text-[16px] pi:text-[24px] 2xl:text-[40px] text-[#4F46E5] ">Secure Remote Signature</h1>
            {pathname !== '/otp' && (
            <button 
            onClick={() => router.push(isRegisterPage ? '/login' : '/register')}
            className={"font-bold text-[#ffffff] mr-1 p-2 pi:py-1 pi:px-3 2xl:p-3 2xl:px-5 bg-indigo rounded-[30px] hover:opacity-70 text-[14px] pi:text-[16px] 2xl:text-[20px]"}
            >
        {isRegisterPage ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
        </button>
            )}
        </div>
    );
}