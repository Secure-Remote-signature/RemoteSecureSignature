import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // สำคัญ: บอก Next.js ว่าตอน build ให้ทำเป็นไฟล์ html (อยู่ในโฟลเดอร์ out)
  images: {
    unoptimized: true, // สำคัญ: เพราะ Electron ไม่มี Server มาช่วย process รูปภาพ
  },
};

export default nextConfig;
