import tkinter as tk
from tkinter import messagebox

import requests
from app_config import build_api_url, build_auth_headers

class SettingPage(tk.Frame):
    def __init__(self, parent, controller):
        # Background: #F9FAFB
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
        # --- Top Navigation Bar ---
        top_bar = tk.Frame(self, bg="#FFFFFF", height=60, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        top_bar.pack(side="top", fill="x")
        
        tk.Label(top_bar, text="Account Settings", font=("Arial", 16, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(side="left", padx=20, pady=15)
        
        tk.Button(top_bar, text="BACK", font=("Arial", 10, "bold"), 
                  bg="#64748B", fg="#FFFFFF", relief="flat", padx=20,
                  command=lambda: controller.show_frame("DashboardPage")).pack(side="right", padx=20)

        # --- Main Content Container ---
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.55, anchor="center", width=850, height=480) # Increased size slightly

        # 1. Create a Footer Frame FIRST (This ensures it stays at the bottom)
        footer = tk.Frame(container, bg="#FFFFFF")
        footer.pack(side="bottom", fill="x", pady=20)

        # 2. Create a Body Frame for the columns
        body = tk.Frame(container, bg="#FFFFFF")
        body.pack(side="top", fill="both", expand=True, padx=20, pady=10)

        # --- Columns inside the BODY frame ---
        left_col = tk.Frame(body, bg="#FFFFFF")
        left_col.pack(side="left", fill="both", expand=True, padx=20)
        
        right_col = tk.Frame(body, bg="#FFFFFF")
        right_col.pack(side="left", fill="both", expand=True, padx=20)

        # --- LEFT COLUMN (Editable Fields) ---
        self.create_label(left_col, "ชื่อ:")
        self.first_name_entry = self.create_entry(left_col, "Professor")
        
        self.create_label(left_col, "นามสกุล:")
        self.last_name_entry = self.create_entry(left_col, "Signature")
        
        self.create_label(left_col, "หมายเลขโทรศัพท์:")
        self.phone_entry = self.create_entry(left_col, "081-234-5678")
        
        # --- Replaced Password Entry with a Button ---
        self.create_label(left_col, "ความปลอดภัย:")
        tk.Button(left_col, text="เปลี่ยนรหัสผ่าน", font=("Arial", 10, "bold"), 
                  bg="#F59E0B", fg="#FFFFFF", relief="flat", activebackground="#D97706",
                  command=lambda: controller.show_frame("ChangePasswordPage")).pack(anchor="w", pady=(5, 0), ipady=5, ipadx=10)

        tk.Button(left_col, text="เปลี่ยน PIN", font=("Arial", 10, "bold"),
              bg="#0EA5E9", fg="#FFFFFF", relief="flat", activebackground="#0284C7",
              command=lambda: controller.show_frame("ChangePinPage")).pack(anchor="w", pady=(8, 0), ipady=5, ipadx=10)

        # --- RIGHT COLUMN (Read-only Fields) ---
        self.create_label(right_col, "ตำแหน่ง (ไม่สามารถแก้ไขได้):", is_admin_only=True)
        self.position_entry = self.create_readonly_text(right_col, "Loading...")
        
        self.create_label(right_col, "คณะ (ไม่สามารถแก้ไขได้):", is_admin_only=True)
        self.faculty_entry = self.create_readonly_text(right_col, "Loading...")
        
        self.create_label(right_col, "อีเมล (ไม่สามารถแก้ไขได้):", is_admin_only=True)
        self.email_entry = self.create_readonly_text(right_col, "Loading...")

        # --- Button inside the FOOTER frame ---
        tk.Button(footer, text="SAVE CHANGES", font=("Arial", 14, "bold"), 
                  bg="#4338CA", fg="#FFFFFF", relief="flat", activebackground="#4F46E5",
                  command=self.save_settings).pack(ipady=10, padx=40, fill="x")

    def load_user_data(self):
        user_id = self.controller.current_user_id 
        api_url = build_api_url(f"/srs/user/profile/{user_id}")

        try:
            response = requests.get(api_url, timeout=5, headers=build_auth_headers(self.controller))
            if response.status_code == 200:
                data = response.json()

                first_name = str(data.get("userName")) if data.get("userName") else ""
                last_name = str(data.get("userLastname")) if data.get("userLastname") else ""
                phone = str(data.get("userPhone")) if data.get("userPhone") else ""

                # 1. (First Name)
                self.first_name_entry.delete(0, tk.END)
                self.first_name_entry.insert(0, first_name)

                # 2. (Last Name)
                self.last_name_entry.delete(0, tk.END)
                self.last_name_entry.insert(0, last_name)

                # 3. (Phone)
                self.phone_entry.delete(0, tk.END)
                self.phone_entry.insert(0, phone)
                
                # Read-only fields
                self.set_entry_text(self.position_entry, data.get('userRole'))
                self.set_entry_text(self.faculty_entry, data.get('userfacultyName'))
                self.set_entry_text(self.email_entry, data.get('userEmail'))
                
                print("Data loaded successfully!")
            else:
                print(f"Backend Error: {response.status_code}")
        except Exception as e:
            import traceback
            traceback.print_exc() 
            print(f"Logic Error: {e}")

    # --- Helper UI Methods ---
    def create_label(self, parent, text, is_admin_only=False):
        color = "#64748B" if is_admin_only else "#1E293B"
        tk.Label(parent, text=text, font=("Arial", 11, "bold"), bg="#FFFFFF", fg=color).pack(anchor="w", pady=(10, 0))

    def create_entry(self, parent, placeholder):
        entry = tk.Entry(parent, font=("Arial", 11), bg="#F3F4F6", relief="flat")
        entry.insert(0, placeholder)
        entry.pack(fill="x", pady=(5, 15), ipady=8)
        return entry

    def create_readonly_text(self, parent, text):
        entry = tk.Entry(parent, font=("Arial", 11), bg="#F3F4F6", relief="flat")
        entry.insert(0, text)
        entry.config(state="readonly")
        entry.pack(fill="x", pady=(5, 15), ipady=8)
        return entry

    def save_settings(self):
        user_id = self.controller.current_user_id
        api_url = build_api_url(f"/srs/user/updateuser/{user_id}")

        payload = {
            "userName": self.first_name_entry.get(),
            "userLastname": self.last_name_entry.get(),
            "userPhone": self.phone_entry.get(),
        }

        try:
            response = requests.put(api_url, json=payload, timeout=5, headers=build_auth_headers(self.controller))
            if response.status_code == 200:
                messagebox.showinfo("สำเร็จ", "อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว!")
                self.controller.current_user = payload["userName"]
            else:
                messagebox.showerror("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้")
        except Exception as e:
            messagebox.showerror("Error", f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {e}")
    
    def delete_account(self):
        if messagebox.askyesno("ยืนยัน", "คุณต้องการลบบัญชีนี้ใช่หรือไม่? ข้อมูลทั้งหมดจะหายไป!"):
            user_id = self.controller.current_user_id
            api_url = build_api_url(f"/srs/user/deluser/{user_id}")

            try:
                response = requests.delete(api_url, timeout=5, headers=build_auth_headers(self.controller))
                if response.status_code == 200:
                    messagebox.showinfo("สำเร็จ", "ลบบัญชีเรียบร้อยแล้ว")
                    self.controller.show_frame("LoginPage") # เด้งกลับไปหน้า Login
                else:
                    messagebox.showerror("ผิดพลาด", "ไม่สามารถลบบัญชีได้")
            except Exception as e:
                messagebox.showerror("Error", f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {e}")
                
    def set_entry_text(self, entry, text):
        """Helper: ปลดล็อกชั่วคราวเพื่อเขียนค่าใหม่จาก Database"""
        if entry is None: return
        
        entry.config(state="normal") # 1. ปลดล็อก
        entry.delete(0, tk.END)      # 2. ล้างค่า
        entry.insert(0, str(text) if text else "") # 3. ใส่ค่าใหม่
        entry.config(state="readonly") # 4. ล็อกกลับเป็น Read-only
                