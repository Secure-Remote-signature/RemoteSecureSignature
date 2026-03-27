'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { isAxiosError } from '@/app/lib/api';
import "@/app/styles/components.css";

interface Faculty {
  facultyId: number;
  facultyName: string;
}

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [formData, setFormData] = useState({
    // username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '', 
    phone: '',
    userRole: '',
    facultyId: '',
    pin: ''
  });

  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const res = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/srs/user/faculties`);
        setFacultyList(res.data);
      } catch (err) {
        console.error("โหลดคณะไม่สำเร็จ:", err);
      }
    };
    fetchFaculties();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
  if (step < 3) {
    setStep(step + 1);
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    alert("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
    return;
  }
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/srs/user/createuser`;
    const response = await api.post(apiUrl, {
      userName: formData.firstName,
      userLastname: formData.lastName,
      userEmail: formData.email,
      userPassword: formData.password,
      userPhone: formData.phone,
      userRole: formData.userRole,
      userfacultyId: formData.facultyId,
      userPin: formData.pin,
      userDate: new Date().toISOString() // ส่งวันที่สมัครไปด้วย
    });

    if (response.status === 201 || response.status === 200) {
      alert("ลงทะเบียนสำเร็จแล้ว! กำลังพากลับไปหน้า Login");
      router.push('/login');
    }
  } catch (error: unknown) {
    console.error("Register Error:", error);
    if (isAxiosError(error) && error.response) {
      alert(error.response.data?.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } else {
      alert("เกิดข้อผิดพลาดในการลงทะเบียน");
    }
  }
};
  const inputStyle = `
    text-Slate-gray mt-3 
    pi:text-[16px] 2xl:text-[24px] 
    pi:p-1 pi:px-3 2xl:px-4 pi:mb-2 2xl:mb-2 p-2
    ring-1 ring-[#C3C5CB] 
    pi:rounded-[30px] 2xl:rounded-[50px] rounded-[30px]
    outline-none focus:ring-2 focus:ring-[#4F46E5] 
    transition-all w-full
  `;
  const primaryBtnStyle = `
    bg-[#4F46E5] mt-5 
    text-[#F9FAFB] font-semibold 
    rounded-[30px] px-12 py-3 
    hover:opacity-90 transition-all shadow-md
    pi:text-[16px] 2xl:text-[20px]
  `;

  const linkStyle = "text-sm text-gray-500 mt-2 underline hover:text-[#4F46E5] cursor-pointer self-center";
  
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        <div className="h-1/2 w-full bg-[#F9FAFB]"></div>
        <div className="h-1/2 w-full bg-[#4F46E5]"></div>
      </div>
      {/* Register Card */}
      <div className="relative z-10 bg-white mb-20 rounded-[25px] shadow-2xl w-full m-5 p-3 py-5 2xl:max-w-md 2xl:p-10 pi:p-3 pi:px-5 flex flex-col items-center">
        
        <h1 className="text-Slate-gray font-semibold text-[20px] pi:text-[20px] 2xl:text-[32px]">
          สร้างบัญชีใหม่
        </h1>
        <div className="w-full flex flex-col mt-2">
          {step === 1 && (
            <>
              {/* <input 
                name="username" 
                placeholder="ชื่อผู้ใช้" 
                className={inputStyle} 
                value={formData.username}
                onChange={handleChange}
              /> */}
              <input 
                name="email" 
                type="email"
                placeholder="อีเมล" 
                required
                className={inputStyle} 
                value={formData.email}
                onChange={handleChange}
              />
              <input 
                name="password" 
                type="password" 
                placeholder="รหัสผ่าน"
                required 
                className={inputStyle} 
                value={formData.password}
                onChange={handleChange}
              />
              <input 
                name="confirmPassword" 
                type="password" 
                placeholder="ยืนยันรหัสผ่าน" 
                required
                className={inputStyle} 
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </>
          )} 

          {step === 2 && (
            <>
              <input 
                name="firstName" 
                placeholder="ชื่อจริง" 
                required
                className={inputStyle} 
                value={formData.firstName}
                onChange={handleChange}
              />
              <input 
                name="lastName" 
                placeholder="นามสกุล" 
                required
                className={inputStyle} 
                value={formData.lastName}
                onChange={handleChange}
              />
              <input 
                name="phone" 
                placeholder="เบอร์โทรศัพท์" 
                className={inputStyle} 
                value={formData.phone}
                onChange={handleChange}
              />
              <select 
                name="userRole"
                value={formData.userRole}
                onChange={handleChange}
                className={inputStyle}
              >
                <option value="">--- ตำแหน่ง ---</option>
                <option value="superadmin">ซูเปอร์แอดมิน</option>
                <option value="professor">อาจารย์</option>
                <option value="staff">เจ้าหน้าที่</option>
                <option value="student">นักศึกษา</option>
              </select>
              <select 
                name="facultyId"
                required
                value={formData.facultyId}
                onChange={handleChange}
                className={inputStyle}
              >
                <option value="">--- เลือกคณะ ---</option>
                {facultyList.map((f) => (
                  <option key={f.facultyId} value={f.facultyId}>{f.facultyName}</option>
                ))}
              </select>
              <button onClick={() => setStep(1)} className={linkStyle}>ย้อนกลับ</button>
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-4">
              <input 
                name="pin"
                type="password"
                maxLength={6}
                placeholder="XXXXXX"
                className={`${inputStyle} text-center tracking-[1em] text-2xl`}
                value={formData.pin}
                onChange={(e) => {
                  if (e.target.value.length <= 6 && /^\d*$/.test(e.target.value)) handleChange(e);
                }}
              />
              <p className="text-gray-400 text-xs mt-2 italic text-center">ใช้สำหรับยืนยันตัวตนที่หน้าเครื่องจักร</p>
              <button onClick={() => setStep(2)} className={linkStyle}>ย้อนกลับ</button>
            </div>
          )}
        </div>
          <button onClick={handleSubmit} className={primaryBtnStyle}>
            {step === 1 ? "ต่อไป" : step === 2 ? "ต่อไป (ตั้งค่า PIN)" : "สมัครสมาชิก"}
          </button>
      </div>
    </div>
  );
}