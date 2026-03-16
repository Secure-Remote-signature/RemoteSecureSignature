import tkinter as tk
from tkinter import messagebox

class ChangePasswordPage(tk.Frame):
    def __init__(self, parent, controller):
        # Background: #F9FAFB
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
        # --- Top Navigation Bar ---
        top_bar = tk.Frame(self, bg="#FFFFFF", height=60, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        top_bar.pack(side="top", fill="x")
        
        tk.Label(top_bar, text="Change Password", font=("Arial", 16, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(side="left", padx=20, pady=15)
        
        tk.Button(top_bar, text="BACK", font=("Arial", 10, "bold"), 
                  bg="#64748B", fg="#FFFFFF", relief="flat", padx=20,
                  command=lambda: controller.show_frame("SettingPage")).pack(side="right", padx=20)

        # --- Main Content (Card style) ---
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=500, height=400)

        # Current Password
        tk.Label(container, text="Current Password", font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40, pady=(30, 0))
        self.current_pass = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", relief="flat", bd=8, show="*")
        self.current_pass.pack(fill="x", padx=40, pady=(5, 15))

        # New Password
        tk.Label(container, text="New Password", font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40)
        self.new_pass = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", relief="flat", bd=8, show="*")
        self.new_pass.pack(fill="x", padx=40, pady=(5, 15))

        # Confirm New Password
        tk.Label(container, text="Confirm New Password", font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#475569").pack(anchor="w", padx=40)
        self.confirm_pass = tk.Entry(container, font=("Arial", 12), bg="#F1F5F9", relief="flat", bd=8, show="*")
        self.confirm_pass.pack(fill="x", padx=40, pady=(5, 20))

        # Save Button
        tk.Button(container, text="SAVE NEW PASSWORD", font=("Arial", 12, "bold"), 
                  bg="#4338CA", fg="#FFFFFF", relief="flat", activebackground="#3730A3",
                  command=self.save_password).pack(fill="x", padx=40, ipady=8, pady=(10, 20))

    def save_password(self):
        # Validate logic goes here (Check if current password is correct, and if new passwords match)
        # ...
        pass