import tkinter as tk

class DashboardPage(tk.Frame):
    def __init__(self, parent, controller):
        # Background color: #F9FAFB
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
        # --- Top Navigation Bar ---
        top_bar = tk.Frame(self, bg="#FFFFFF", height=60, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        top_bar.pack(side="top", fill="x")
        
        # Welcome text 
        self.user_lbl = tk.Label(top_bar, text="Welcome, Professor", font=("Arial", 14, "bold"), 
                                 bg="#FFFFFF", fg="#1E293B")
        self.user_lbl.pack(side="left", padx=20, pady=15)
        
        # Action Buttons Container (Right Side)
        btn_container = tk.Frame(top_bar, bg="#FFFFFF")
        btn_container.pack(side="right", padx=10)

        # Setting Button (Gray style: #64748B)
        tk.Button(btn_container, text="SETTING", font=("Arial", 10, "bold"), 
                  bg="#64748B", fg="#FFFFFF", relief="flat", padx=15,
                  command=lambda: controller.show_frame("SettingPage")).pack(side="left", padx=5)

        # Logout button
        tk.Button(btn_container, text="LOGOUT", font=("Arial", 10, "bold"), 
                  bg="#EF4444", fg="#FFFFFF", relief="flat", padx=15,
                  command=self.controller.logout).pack(side="left", padx=5)

        # --- Main Content Area ---
        content_frame = tk.Frame(self, bg="#F9FAFB")
        content_frame.place(relx=0.5, rely=0.5, anchor="center")

        # Status Icon/Label
        tk.Label(content_frame, text="🔔", font=("Arial", 60), bg="#F9FAFB").pack()
        
        tk.Label(content_frame, text="Waiting for new signature requests...", 
                                font=("Arial", 18), bg="#F9FAFB", fg="#64748B").pack(pady=20)

        # Accept Request Button
        tk.Button(content_frame, text="ACCEPT REQUEST", font=("Arial", 16, "bold"), 
                                    bg="#4338CA", fg="#FFFFFF", width=20,
                                    command=lambda: controller.show_frame("SignaturePage")).pack(pady=20, ipady=10)

        # View History Button
        tk.Button(self, text="View Signing History", font=("Arial", 12, "underline"), 
                  bg="#F9FAFB", fg="#4F46E5", bd=0, cursor="hand2",
                  command=lambda: controller.show_frame("HistoryPage")).pack(side="bottom", pady=30)

    def update_user_info(self):
        """Update the welcome label with the actual username after login"""
        if hasattr(self.controller, 'current_user'):
            self.user_lbl.config(text=f"Welcome, {self.controller.current_user}")