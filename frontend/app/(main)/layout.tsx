import "@/app/styles/globals.css";
import MainNavbar from "../components/MainNavbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="w-full bg-white flex items-center border-b-[3px]">
        <MainNavbar />
      </header>

      <main className="flex-1 bg-[#F9FAFB] overflow-auto">
        {children}
      </main>
    </div>
  );
}
