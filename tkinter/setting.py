import tkinter as tk
from tkinter import messagebox

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
        self.create_label(left_col, "First Name:")
        self.first_name_entry = self.create_entry(left_col, "Professor")
        
        self.create_label(left_col, "Last Name:")
        self.last_name_entry = self.create_entry(left_col, "Signature")
        
        self.create_label(left_col, "Phone Number:")
        self.phone_entry = self.create_entry(left_col, "081-234-5678")
        
        # --- Replaced Password Entry with a Button ---
        self.create_label(left_col, "Security:")
        tk.Button(left_col, text="CHANGE PASSWORD", font=("Arial", 10, "bold"), 
                  bg="#F59E0B", fg="#FFFFFF", relief="flat", activebackground="#D97706",
                  command=lambda: controller.show_frame("ChangePasswordPage")).pack(anchor="w", pady=(5, 0), ipady=5, ipadx=10)

        # --- RIGHT COLUMN (Read-only Fields) ---
        self.create_label(right_col, "Position (Read-only):", is_admin_only=True)
        self.create_readonly_text(right_col, "Dean of Engineering")
        
        self.create_label(right_col, "Faculty (Read-only):", is_admin_only=True)
        self.create_readonly_text(right_col, "Engineering & Technology")
        
        self.create_label(right_col, "Email (Read-only):", is_admin_only=True)
        self.create_readonly_text(right_col, "prof.signature@university.ac.th")

        # --- Button inside the FOOTER frame ---
        tk.Button(footer, text="SAVE CHANGES", font=("Arial", 14, "bold"), 
                  bg="#4338CA", fg="#FFFFFF", relief="flat", activebackground="#4F46E5",
                  command=self.save_settings).pack(ipady=10, padx=40, fill="x")

    # --- Helper UI Methods ---
    def create_label(self, parent, text, is_admin_only=False):
        color = "#64748B" if is_admin_only else "#1E293B"
        tk.Label(parent, text=text, font=("Arial", 11, "bold"), bg="#FFFFFF", fg=color).pack(anchor="w", pady=(10, 0))

    def create_entry(self, parent, initial_val, is_password=False):
        show_char = "*" if is_password else ""
        entry = tk.Entry(parent, font=("Arial", 12), bg="#F9FAFB", fg="#1E293B", 
                         relief="solid", bd=1, show=show_char)
        entry.insert(0, initial_val)
        entry.pack(fill="x", pady=5, ipady=5)
        return entry

    def create_readonly_text(self, parent, text):
        lbl = tk.Label(parent, text=text, font=("Arial", 12), bg="#F3F4F6", fg="#9CA3AF", 
                       anchor="w", padx=10, relief="solid", bd=1)
        lbl.pack(fill="x", pady=5, ipady=5)

    def save_settings(self):
        # Logic to send updated data to Backend goes here
        messagebox.showinfo("Success", "Settings updated successfully!")