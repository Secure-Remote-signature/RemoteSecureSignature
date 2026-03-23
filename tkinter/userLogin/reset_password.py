import tkinter as tk
from tkinter import messagebox
import requests
class ResetPasswordPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.email_address = None
        self.setup_ui()

    def setup_ui(self):
        # --- Main Container (Card style) ---
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=450, height=500)

        # --- Title ---
        tk.Label(container, text="Create New Password", font=("Arial", 20, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(pady=(30, 20))

        # --- Secret Code / OTP Input ---
        tk.Label(container, text="Reset Code (OTP)", font=("Arial", 10, "bold"), 
                 bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40)
        self.code_entry = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", fg="#1E293B", relief="flat", bd=8)
        self.code_entry.pack(fill="x", padx=40, pady=(5, 15))

        # --- New Password Input ---
        tk.Label(container, text="New Password", font=("Arial", 10, "bold"), 
                 bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40)
        self.new_pass_entry = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", fg="#1E293B", 
                                       relief="flat", bd=8, show="*")
        self.new_pass_entry.pack(fill="x", padx=40, pady=(5, 15))

        # --- Confirm Password Input ---
        tk.Label(container, text="Confirm Password", font=("Arial", 10, "bold"), 
                 bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40)
        self.confirm_pass_entry = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", fg="#1E293B", 
                                           relief="flat", bd=8, show="*")
        self.confirm_pass_entry.pack(fill="x", padx=40, pady=(5, 20))

        # --- Action Buttons ---
        tk.Button(container, text="UPDATE PASSWORD", font=("Arial", 12, "bold"), 
                  bg="#10B981", fg="#FFFFFF", activebackground="#059669", relief="flat",
                  command=self.handle_reset_password).pack(fill="x", padx=40, ipady=8, pady=(10, 10))

        tk.Button(container, text="Cancel", font=("Arial", 10, "underline"), 
                  bg="#FFFFFF", fg="#64748B", activeforeground="#1E293B", relief="flat", bd=0, cursor="hand2",
                  command=lambda: self.controller.show_frame("LoginPage")).pack()

    def handle_reset_password(self):
        otp = self.code_entry.get()
        new_pass = self.new_pass_entry.get()
        confirm_pin = self.confirm_pass_entry.get()

        if new_pass != confirm_pin:
            messagebox.showwarning("Warning", "PINs do not match!")
            return

        backend_url = "http://192.168.1.39:5000/api/verify-otp"

        try:
            payload = {
                "email": self.email_address, # ต้องมีค่านี้ส่งไปด้วย!
                "otp": self.code_entry.get(),
                "newPassword": self.new_pass_entry.get()
            }
            response = requests.post("http://localhost:5000/srs/user/verify-otp", json=payload)
            if response.status_code == 200:
                messagebox.showinfo("Success", "Your PIN has been reset.")
                self.controller.show_frame("LoginPage")
            else:
                messagebox.showerror("Error", "Invalid OTP or OTP expired.")
        except Exception as e:
            messagebox.showerror("Connection Error", str(e))
    
    def set_request_data(self, data):
        self.email_address = data
        self.code_entry.delete(0, tk.END)
        self.new_pass_entry.delete(0, tk.END)
        self.confirm_pass_entry.delete(0, tk.END)
        print(f"ได้รับอีเมลเข้าระบบรีเซ็ตแล้ว: {self.email_address}")