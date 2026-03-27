import tkinter as tk
from tkinter import messagebox
import requests
from app_config import build_api_url, build_auth_headers

OTP_COOLDOWN_SECONDS = 60


class ChangePinPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.otp_cooldown_remaining = 0
        self.otp_expiry_remaining = 0
        self.show_sensitive_var = tk.BooleanVar(value=False)

        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=460, height=670)

        tk.Label(container, text="Change PIN", font=("Arial", 18, "bold"), bg="#FFFFFF", fg="#1E293B").pack(pady=(26, 8))
        tk.Label(
            container,
            text="ยืนยัน Email + Password + OTP และต้องกรอก PIN เดิม",
            font=("Arial", 10),
            bg="#FFFFFF",
            fg="#64748B",
        ).pack(pady=(0, 18))

        self.email_entry = self._input(container, "Email")
        self.password_entry = self._input(container, "Password", is_password=True)
        self.otp_entry = self._input(container, "OTP (6 digits)")
        self.old_pin_entry = self._input(container, "Old PIN (6 digits)", is_password=True)
        self.new_pin_entry = self._input(container, "New PIN (6 digits)", is_password=True)
        self.confirm_pin_entry = self._input(container, "Confirm New PIN", is_password=True)

        tk.Checkbutton(
            container,
            text="แสดง Password/PIN",
            variable=self.show_sensitive_var,
            bg="#FFFFFF",
            fg="#64748B",
            activebackground="#FFFFFF",
            command=self._apply_sensitive_visibility,
        ).pack(anchor="w", padx=42, pady=(0, 8))

        self.send_otp_button = tk.Button(
            container,
            text="SEND OTP",
            font=("Arial", 10, "bold"),
            bg="#0EA5E9",
            fg="#FFFFFF",
            relief="flat",
            command=self.send_otp,
        )
        self.send_otp_button.pack(fill="x", padx=42, ipady=8, pady=(8, 8))

        tk.Button(
            container,
            text="CHANGE PIN",
            font=("Arial", 11, "bold"),
            bg="#4338CA",
            fg="#FFFFFF",
            relief="flat",
            command=self.change_pin,
        ).pack(fill="x", padx=42, ipady=10)

        self.status_label = tk.Label(container, text="", font=("Arial", 9), bg="#FFFFFF", fg="#64748B", wraplength=370, justify="left")
        self.status_label.pack(fill="x", padx=42, pady=(10, 0))

        self.otp_expiry_label = tk.Label(container, text="", font=("Arial", 9), bg="#FFFFFF", fg="#0369A1")
        self.otp_expiry_label.pack(fill="x", padx=42, pady=(2, 0))

        tk.Button(
            container,
            text="BACK",
            font=("Arial", 10, "underline"),
            bg="#FFFFFF",
            fg="#64748B",
            bd=0,
            cursor="hand2",
            command=lambda: self.controller.show_frame("SettingPage"),
        ).pack(pady=16)

    def _input(self, parent, label, is_password=False):
        tk.Label(parent, text=label, font=("Arial", 10), bg="#FFFFFF", fg="#64748B").pack(anchor="w", padx=42)
        entry = tk.Entry(parent, font=("Arial", 12), bg="#F3F4F6", relief="flat", show="*" if is_password else "")
        entry.is_sensitive = is_password
        entry.pack(fill="x", padx=42, pady=(4, 10), ipady=8)
        return entry

    def _apply_sensitive_visibility(self):
        show_secret = self.show_sensitive_var.get()
        for entry in [self.password_entry, self.old_pin_entry, self.new_pin_entry, self.confirm_pin_entry]:
            if getattr(entry, "is_sensitive", False):
                entry.config(show="" if show_secret else "*")

    def _set_status(self, text, is_error=False):
        self.status_label.config(text=text, fg="#B91C1C" if is_error else "#0F766E")

    def _parse_error_message(self, res):
        try:
            return res.json().get("error", f"HTTP {res.status_code}")
        except Exception:
            return f"HTTP {res.status_code}"

    def _start_otp_cooldown(self):
        self.otp_cooldown_remaining = OTP_COOLDOWN_SECONDS
        self.send_otp_button.config(state="disabled")
        self._tick_otp_cooldown()

    def _start_otp_expiry_countdown(self, expires_in_sec):
        self.otp_expiry_remaining = max(0, int(expires_in_sec))
        self._tick_otp_expiry()

    def _tick_otp_expiry(self):
        if self.otp_expiry_remaining <= 0:
            self.otp_expiry_label.config(text="OTP หมดอายุแล้ว กรุณาขอรหัสใหม่")
            return

        mins = self.otp_expiry_remaining // 60
        secs = self.otp_expiry_remaining % 60
        self.otp_expiry_label.config(text=f"OTP จะหมดอายุใน {mins:02d}:{secs:02d}")
        self.otp_expiry_remaining -= 1
        self.after(1000, self._tick_otp_expiry)

    def _tick_otp_cooldown(self):
        if self.otp_cooldown_remaining <= 0:
            self.send_otp_button.config(state="normal", text="SEND OTP")
            return

        self.send_otp_button.config(text=f"SEND OTP ({self.otp_cooldown_remaining}s)")
        self.otp_cooldown_remaining -= 1
        self.after(1000, self._tick_otp_cooldown)

    def clear_fields(self):
        for entry in [self.email_entry, self.password_entry, self.otp_entry, self.old_pin_entry, self.new_pin_entry, self.confirm_pin_entry]:
            entry.delete(0, tk.END)
        self._set_status("")
        self.otp_expiry_label.config(text="")

    def send_otp(self):
        if self.otp_cooldown_remaining > 0:
            self._set_status(f"กรุณารอ {self.otp_cooldown_remaining} วินาทีก่อนส่ง OTP ใหม่", is_error=True)
            return

        email = self.email_entry.get().strip()
        if not email:
            messagebox.showwarning("Warning", "กรุณากรอก Email")
            self._set_status("กรุณากรอก Email ก่อนส่ง OTP", is_error=True)
            return

        try:
            res = requests.post(build_api_url("/srs/user/request-otp"), json={"email": email}, timeout=8)
        except Exception as exc:
            messagebox.showerror("Connection Error", f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {exc}")
            self._set_status(f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {exc}", is_error=True)
            return

        if res.status_code == 200:
            body = res.json() if res.headers.get("Content-Type", "").startswith("application/json") else {}
            messagebox.showinfo("Success", "ส่ง OTP เรียบร้อยแล้ว")
            self._set_status("ส่ง OTP แล้ว กรุณาตรวจอีเมลและกรอกภายใน 5 นาที")
            self._start_otp_expiry_countdown(body.get("expiresInSec", 300))
            self.otp_cooldown_remaining = int(body.get("cooldownSec", OTP_COOLDOWN_SECONDS))
            self._start_otp_cooldown()
        else:
            err = self._parse_error_message(res)
            messagebox.showerror("Error", err)
            self._set_status(err, is_error=True)
            try:
                retry_after = int(res.json().get("retryAfterSec", 0))
            except Exception:
                retry_after = 0
            if retry_after > 0:
                self.otp_cooldown_remaining = retry_after
                self.send_otp_button.config(state="disabled")
                self._tick_otp_cooldown()

    def change_pin(self):
        user_id = getattr(self.controller, "current_user_id", None)
        if not user_id:
            messagebox.showerror("Error", "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่")
            self._set_status("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่", is_error=True)
            self.controller.show_frame("LoginPage")
            return

        email = self.email_entry.get().strip()
        password = self.password_entry.get()
        otp = self.otp_entry.get().strip()
        old_pin = self.old_pin_entry.get().strip()
        new_pin = self.new_pin_entry.get().strip()
        confirm_pin = self.confirm_pin_entry.get().strip()

        if not email or not password or not otp or not old_pin or not new_pin or not confirm_pin:
            messagebox.showwarning("Warning", "กรุณากรอกข้อมูลให้ครบ")
            self._set_status("กรุณากรอกข้อมูลให้ครบทุกช่อง", is_error=True)
            return

        if new_pin != confirm_pin:
            messagebox.showerror("Error", "PIN ใหม่ไม่ตรงกัน")
            self._set_status("PIN ใหม่และยืนยัน PIN ไม่ตรงกัน", is_error=True)
            return

        if not (old_pin.isdigit() and len(old_pin) == 6 and new_pin.isdigit() and len(new_pin) == 6):
            messagebox.showerror("Error", "PIN ต้องเป็นตัวเลข 6 หลัก")
            self._set_status("PIN เดิม/ใหม่ต้องเป็นตัวเลข 6 หลัก", is_error=True)
            return

        try:
            res = requests.put(
                build_api_url(f"/srs/user/change-pin/{user_id}"),
                json={
                    "email": email,
                    "password": password,
                    "otp": otp,
                    "oldPin": old_pin,
                    "newPin": new_pin,
                },
                timeout=8,
                headers=build_auth_headers(self.controller),
            )
        except Exception as exc:
            messagebox.showerror("Connection Error", f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {exc}")
            self._set_status(f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {exc}", is_error=True)
            return

        if res.status_code == 200:
            messagebox.showinfo("Success", "เปลี่ยน PIN สำเร็จ")
            self._set_status("เปลี่ยน PIN สำเร็จ")
            self.clear_fields()
            self.controller.show_frame("SettingPage")
            return

        err = self._parse_error_message(res)
        messagebox.showerror("Error", err)
        self._set_status(err, is_error=True)
