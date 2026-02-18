import "@/app/styles/globals.css";
import Navbar from "../components/Navbar";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   <div className="grid grid-cols-5 grid-rows-10 h-screen w-full overflow-hidden">
        <div className="col-span-5 row-span-1 bg-off-white align-middle flex items-center border-b-[3px] border-">
            <Navbar/>
        </div>
        <div className="col-span-5 row-span-9 row-start-2 bg-[#F9FAFB]"> 
          {children}
        </div>
      </div>
  );
}
