import "@/app/styles/components.css"
export default function Login()
{
    return (
        <div className={`min-h-screen relative flex items-center justify-center`}>
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        {/* ส่วนบนสีขาว (ครึ่งบน) */}
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        {/* ส่วนล่างสีน้ำเงินม่วง (ครึ่งล่าง) - ปรับสีตามภาพ */}
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 bg-white mb-10 rounded-[20px] shadow-2xl w-full max-w-sm  2xl:p-8 pi:p-5 flex flex-col items-center">
        <h1 className="text-Slate-gray font-semibold pi:text-[24px] 2xl:text-[32px]">ลงชื่อเข้าใช้</h1>
        <div className="w-full flex flex-col">
        <input placeholder="ชื่อผู้ใช้" className="text-Slate-gray mt-3 pi:text-[16px] 2xl:text-[24px] ring-1 pi:rounded-[30px] 2xl:rounded-[50px] ring-[#C3C5CB] pi:p-2 2xl:p-4 pi:mb-5 2xl:mb-5"></input>
        <input placeholder="รหัสผ่าน" className="text-Slate-gray mt-3 pi:text-[16px] 2xl:text-[24px] ring-1 pi:rounded-[30px] 2xl:rounded-[50px] ring-[#C3C5CB] pi:p-2 2xl:p-4 pi:mb-5 2xl:mb-5"></input>
        </div>
        <div className="w-full flex justify-end-safe items-end-safe">
            <button className="text-black font-light  hover:opacity-70"><p className="hover:underline">ลืมรหัสผ่าน?</p></button>
        </div>
        <button className="bg-indigo mt-5 text-[#F9FAFB] font-semibold rounded-[30px] p-3 px-5 hover:opacity-70">เข้าสู่ระบบ</button>
      </div>
    </div>
    );
}