import tkinter as tk
from tkinter import messagebox

import requests

class LoginPage(tk.Frame):
    def __init__(self, parent, controller):
        # Initialize the frame with a light gray background
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
        # --- UI Setup ---
        # Create a white "Card" frame in the center of the screen
        center_frame = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        center_frame.place(relx=0.5, rely=0.5, anchor="center", width=450, height=500) # Increased height for link
        
        # Title Label
        tk.Label(center_frame, text="System Login", font=("Arial", 28, "bold"), 
                 bg="#FFFFFF", fg="#4F46E5").pack(pady=(40, 20))
        
        # Email Input Section
        tk.Label(center_frame, text="Email:", font=("Arial", 12, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(anchor="w", padx=40, pady=(10, 0))
        
        self.username_entry = tk.Entry(center_frame, font=("Arial", 14), bg="#F9FAFB", 
                                       fg="#1E293B", bd=1, relief="solid")
        self.username_entry.pack(padx=40, pady=5, ipady=8, fill="x") 
        
        # Password Input Section
        tk.Label(center_frame, text="Password:", font=("Arial", 12, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(anchor="w", padx=40, pady=(10, 0))
        
        self.password_entry = tk.Entry(center_frame, font=("Arial", 14), bg="#F9FAFB", 
                                       fg="#1E293B", bd=1, relief="solid", show="*")
        self.password_entry.pack(padx=40, pady=5, ipady=8, fill="x")

        # --- FORGOT PASSWORD LINK ---
        # Align this text button to the right side of the card
        tk.Button(center_frame, text="Forgot Password?", font=("Arial", 10, "underline"), 
                  bg="#FFFFFF", fg="#4F46E5", activeforeground="#3730A3", 
                  relief="flat", bd=0, cursor="hand2",
                  command=lambda: self.controller.show_frame("ForgotPasswordPage")).pack(anchor="e", padx=40, pady=(5, 20))

        # --- LOGIN BUTTON ---
        # Main action button to verify credentials
        tk.Button(center_frame, text="LOGIN", font=("Arial", 14, "bold"), 
                  bg="#4338CA", fg="#FFFFFF", activebackground="#4F46E5",
                  relief="flat", cursor="hand2", bd=0,
                  command=self.verify_login).pack(pady=10, ipady=10, padx=40, fill="x")
                  
    def verify_login(self):
        """Check user credentials and navigate to the Dashboard"""
        username = self.username_entry.get()
        password = self.password_entry.get()
        
        api_url = "http://localhost:5000/api/user/login"
        payload = {
            "userEmail": username, 
            "userPassword": password
        }
        
        try:
            # Sending POST request with English comments for clarity
            response = requests.post(api_url, json=payload, timeout=5)

            if response.status_code == 200:
                data = response.json()
                self.controller.current_user = data.get("full_name")
                
                # Navigate to Dashboard on success
                self.controller.show_frame("DashboardPage")
            else:
                messagebox.showerror("Login Failed", "Invalid credentials from server.")

        except Exception as e:
            messagebox.showerror("Connection Error", f"Cannot connect to Node.js server: {e}")