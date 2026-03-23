import tkinter as tk
from tkinter import messagebox
import requests
from app_config import build_api_url

class ForgotPasswordPage(tk.Frame):
    def __init__(self, parent, controller):
        # Set background color to light gray
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.setup_ui()

    def setup_ui(self):
        # --- Main Container (Card style) ---
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=450, height=400)

        # --- Title & Description ---
        tk.Label(container, text="Forgot Password", font=("Arial", 20, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(pady=(40, 10))
                 
        tk.Label(container, text="Enter your registered email address.\nWe will send you a reset code.", 
                 font=("Arial", 11), bg="#FFFFFF", fg="#64748B", justify="center").pack(pady=(0, 30))

        # --- Email Input Field ---
        tk.Label(container, text="Email Address", font=("Arial", 10, "bold"), 
                 bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40)
                 
        self.email_entry = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", fg="#1E293B", 
                                    relief="flat", bd=10) # bd=10 acts as internal padding for Entry
        self.email_entry.pack(fill="x", padx=40, pady=(5, 20))

        # --- Action Buttons ---
        tk.Button(container, text="SEND RESET CODE", font=("Arial", 12, "bold"), 
                  bg="#4F46E5", fg="#FFFFFF", activebackground="#4338CA", relief="flat",
                  command=self.handle_send_code).pack(fill="x", padx=40, ipady=8, pady=(10, 10))

        tk.Button(container, text="Back to Login", font=("Arial", 10, "underline"), 
                  bg="#FFFFFF", fg="#64748B", activeforeground="#1E293B", relief="flat", bd=0, cursor="hand2",
                  command=lambda: self.controller.show_frame("LoginPage")).pack()

    def handle_send_code(self):
        email = self.email_entry.get()
        backend_url = build_api_url("/srs/user/request-otp")
        response = None 

        try:
            response = requests.post(backend_url, json={"email": email}, timeout=5)
            
            if response.status_code == 200:
                email_user = self.email_entry.get()
                messagebox.showinfo("Success", "OTP has been sent to your email.")
                self.controller.shared_data = {"email": email} 
                self.controller.show_frame("ResetPasswordPage", data=email_user)
            else:
                messagebox.showerror("Error", f"Server error: {response.status_code}")
                
        except Exception as e:
            print(f"DEBUG: Connection failed -> {e}")
            messagebox.showerror("Connection Error", "เชื่อมต่อ Server ไม่ได้ (เช็คว่ารัน Backend หรือยัง?)")
            
    def clear_fields(self):
        if hasattr(self, 'email_entry'):
            self.email_entry.delete(0, tk.END)
            print("ล้างช่องกรอกอีเมลในหน้า Forgot Password เรียบร้อย")