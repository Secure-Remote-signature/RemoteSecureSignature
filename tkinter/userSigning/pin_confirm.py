import tkinter as tk
from tkinter import messagebox
import requests
from app_config import build_api_url, build_auth_headers

class PinConfirmPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.pin_code = "" 
        self.pending_payload = None
        
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=400, height=550)

        tk.Label(container, text="Security Verification", font=("Arial", 18, "bold"), 
            bg="#FFFFFF", fg="#1E293B").pack(pady=(30, 10))
        
        tk.Label(container, text="Enter your 6-digit PIN to confirm", font=("Arial", 11), 
            bg="#FFFFFF", fg="#64748B").pack(pady=(0, 20))

        self.dots_label = tk.Label(container, text="○ ○ ○ ○ ○ ○", font=("Arial", 30), 
            bg="#FFFFFF", fg="#4F46E5")
        self.dots_label.pack(pady=20)

        numpad_frame = tk.Frame(container, bg="#FFFFFF")
        numpad_frame.pack(padx=20, pady=10)

        buttons = [
            '1', '2', '3',
            '4', '5', '6',
            '7', '8', '9',
            'CLR', '0', 'OK'
        ]

        row, col = 0, 0
        for btn_text in buttons:
            btn_bg = "#F1F5F9"
            btn_fg = "#1E293B"
            
            if btn_text == "OK":
                btn_bg = "#4338CA"
                btn_fg = "#FFFFFF"
            elif btn_text == "CLR":
                btn_bg = "#FEE2E2"
                btn_fg = "#991B1B"

            btn = tk.Button(numpad_frame, text=btn_text, font=("Arial", 16, "bold"),
                            width=6, height=2, bg=btn_bg, fg=btn_fg, relief="flat",
                            activebackground="#E2E8F0", bd=0,
                            command=lambda t=btn_text: self.on_button_click(t))
            btn.grid(row=row, column=col, padx=5, pady=5)
            
            col += 1
            if col > 2:
                col = 0
                row += 1

        tk.Button(container, text="Cancel", font=("Arial", 10, "underline"), 
            bg="#FFFFFF", fg="#64748B", bd=0, cursor="hand2",
            command=lambda: controller.show_frame("SignaturePage")).pack(pady=20)

        tk.Button(
            container,
            text="Forgot PIN?",
            font=("Arial", 10, "underline"),
            bg="#FFFFFF",
            fg="#4338CA",
            bd=0,
            cursor="hand2",
            command=self.go_to_forgot_pin,
        ).pack()

    def on_button_click(self, key):
        if key == "CLR":
            self.pin_code = ""
        elif key == "OK":
            self.verify_pin()
            return
        else:
            if len(self.pin_code) < 6:
                self.pin_code += key
        
        self.update_dots()

    def update_dots(self):
        entered = len(self.pin_code)
        display = "● " * entered + "○ " * (6 - entered)
        self.dots_label.config(text=display.strip())

    def verify_pin(self):
        if len(self.pin_code) != 6:
            messagebox.showwarning("Warning", "กรุณากรอก PIN ให้ครบ 6 หลัก")
            return

        user_id = getattr(self.controller, "current_user_id", None)
        if not user_id:
            messagebox.showerror("Error", "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่")
            self.pin_code = ""
            self.update_dots()
            self.controller.show_frame("LoginPage")
            return

        try:
            res = requests.post(
                build_api_url("/srs/user/verify-pin"),
                json={"userId": user_id, "userPin": self.pin_code},
                timeout=5,
                headers=build_auth_headers(self.controller),
            )
        except Exception as exc:
            messagebox.showerror("Connection Error", f"ไม่สามารถตรวจสอบ PIN กับเซิร์ฟเวอร์ได้: {exc}")
            return

        if res.status_code == 200:
            self.pin_code = ""
            self.update_dots()
            if not self.pending_payload:
                messagebox.showwarning("Warning", "ไม่พบข้อมูลงานลงนาม")
                self.controller.show_frame("SignaturePage")
                return
            payload = self.pending_payload
            self.pending_payload = None
            self.controller.show_frame("ExecutionPage", data=payload)
            return

        if res.status_code == 401:
            messagebox.showerror("Invalid PIN", "PIN ไม่ถูกต้อง")
        elif res.status_code == 404:
            messagebox.showerror("Error", "ไม่พบผู้ใช้งานในระบบ")
        else:
            messagebox.showerror("Error", f"ตรวจสอบ PIN ไม่สำเร็จ (HTTP {res.status_code})")

        self.pin_code = ""
        self.update_dots()

    def set_request_data(self, data):
        self.pending_payload = data or None

    def go_to_forgot_pin(self):
        self.controller.show_frame("ForgotPinPage", data={"pending_payload": self.pending_payload})