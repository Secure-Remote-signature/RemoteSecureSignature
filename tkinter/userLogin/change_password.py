import tkinter as tk
from tkinter import messagebox
import requests
from app_config import build_api_url, build_auth_headers

class ChangePasswordPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller

        # --- UI Header ---
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=400, height=450)

        tk.Label(container, text="Change Password", font=("Arial", 18, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(pady=(30, 20))

        # --- Input Fields ---
        self.old_pass_entry = self.create_input(container, "Current Password")
        self.new_pass_entry = self.create_input(container, "New Password")
        self.confirm_pass_entry = self.create_input(container, "Confirm New Password")

        # --- Buttons ---
        tk.Button(container, text="UPDATE PASSWORD", font=("Arial", 12, "bold"), 
                  bg="#4338CA", fg="#FFFFFF", relief="flat", command=self.handle_change).pack(pady=20, fill="x", padx=40, ipady=10)

        tk.Button(container, text="CANCEL", font=("Arial", 10), 
                  bg="#FFFFFF", fg="#64748B", relief="flat", 
                  command=lambda: controller.show_frame("SettingPage")).pack()

    def create_input(self, parent, label_text):
        tk.Label(parent, text=label_text, font=("Arial", 10), bg="#FFFFFF", fg="#64748B").pack(anchor="w", padx=40)
        entry = tk.Entry(parent, font=("Arial", 12), bg="#F3F4F6", relief="flat", show="*")
        entry.insert(0, "")
        entry.pack(fill="x", padx=40, pady=(5, 15), ipady=8)
        return entry

    def handle_change(self):
        old_p = self.old_pass_entry.get()
        new_p = self.new_pass_entry.get()
        confirm_p = self.confirm_pass_entry.get()

        # 1. Validation Checks
        if not old_p or not new_p or not confirm_p:
            messagebox.showwarning("Warning", "กรุณากรอกข้อมูลให้ครบทุกช่อง")
            return
        
        if new_p != confirm_p:
            messagebox.showerror("Error", "รหัสผ่านใหม่ไม่ตรงกัน")
            return

        # 2. Backend API Call
        user_id = self.controller.current_user_id
        api_url = build_api_url(f"/srs/user/change-password/{user_id}")
        payload = {
            "oldPassword": old_p,
            "newPassword": new_p
        }

        try:
            response = requests.put(api_url, json=payload, timeout=5, headers=build_auth_headers(self.controller))
            if response.status_code == 200:
                messagebox.showinfo("Success", "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!")
                self.controller.show_frame("SettingPage")
                self.old_pass_entry.delete(0, tk.END)
                self.new_pass_entry.delete(0, tk.END)
                self.confirm_pass_entry.delete(0, tk.END)
            else:
                error_msg = response.json().get("error", "เกิดข้อผิดพลาด")
                messagebox.showerror("Error", error_msg)
        except Exception as e:
            messagebox.showerror("Connection Error", f"ติดต่อ Server ไม่ได้: {e}")