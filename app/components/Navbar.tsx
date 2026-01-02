import "@/app/styles/components.css"
export default function Navbar()
{
    return(
        <div className="w-full flex flex-row justify-between align-middle items-center pi:mx-3 2xl:mx-5">
            <h1 className="font-black pi:text-[32px] 2xl:text-[40px]  text-[#4F46E5] ">Secure Remote Signature</h1>
            <button className="font-bold text-[#ffffff] pi:p-1 pi:px-3 2xl:p-3 2xl:px-5 bg-indigo rounded-[30px] hover:opacity-70 pi:text-[16px] 2xl:text-[20px]">สร้างบัญชีใหม่</button>
        </div>
    );
}