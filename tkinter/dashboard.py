import tkinter as tk
from tkinter import messagebox, ttk

import requests
from alert import IncomingAlert

class DashboardPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.prof_id = None
        
        self.last_notified_id = None  # To track the last notified request ID for polling
        
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

        self.poll_for_requests()  # Start polling for new requests
        
    def update_user_info(self):
        self.last_notified_id = None
        
        if hasattr(self.controller, 'current_user_id'):
            self.prof_id = self.controller.current_user_id
            print(f"DEBUG: Dashboard ได้รับ ID อาจารย์แล้ว: {self.prof_id}")

        if hasattr(self.controller, 'current_user'):
            self.user_lbl.config(text=f"Welcome, {self.controller.current_user}")
  
    def poll_for_requests(self):
        if self.prof_id is None:
            self.after(3000, self.poll_for_requests)
            return

        try:
            url = f"http://localhost:5000/srs/request/pending/{self.prof_id}"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                
                if data and "requestId" in data:
                    print(f"✅ เจอคำร้องจากคุณ: {data.get('studentName')}")
                    
                    self.trigger_alert(data) 
                    return 
                else:
                    print(f"😴 ID {self.prof_id}: ยังไม่มีคำร้องใหม่...")
                    
        except Exception as e:
            print(f"❌ Connection Error: {e}")

        self.after(3000, self.poll_for_requests)

    def trigger_alert(self, data):
        from alert import IncomingAlert
        self.last_notified_id = data.get('requestId') 

        alert = IncomingAlert(
            self, 
            data=data, 
            on_accept=lambda: self.accept_action(data),
            on_reject=lambda: self.handle_reject(data)
        )
        self.wait_window(alert) 
        self.poll_for_requests() 

    def accept_action(self, data):
        self.controller.show_frame("ExecutionPage", data=data)
    
    def handle_reject(self, data):
        req_id = data.get('requestId')
        api_url = f"http://localhost:5000/srs/request/update-status/{req_id}"
        
        try:
            res = requests.put(api_url, json={"status": "Rejected"}, timeout=3)
            if res.status_code == 200:
                messagebox.showinfo("สำเร็จ", "ปฏิเสธคำร้องแล้ว")
            else:
                print(f"Update failed: {res.status_code}")
        except Exception as e:
            print(f"Error rejecting: {e}")
    
    