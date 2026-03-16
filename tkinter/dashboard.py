import tkinter as tk
from tkinter import messagebox, ttk

import requests
from alert import IncomingAlert

class DashboardPage(tk.Frame):
    def __init__(self, parent, controller):
        # Background color: #F9FAFB
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
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
        
        if hasattr(self.controller, 'current_user'):
            self.user_lbl.config(text=f"Welcome, {self.controller.current_user}")
  
    def poll_for_requests(self):
        prof_id = self.controller.current_user_id
        if not prof_id:
            self.after(3000, self.poll_for_requests)
            return
        
        if not data:
            self.status_label.config(text="✅ ทุกอย่างเรียบร้อย! ไม่มีงานค้าง", fg="#10B981")
        else:
            self.status_label.config(text="🔔 มี 1 รายการใหม่รอการเซ็นชื่อ", fg="#F59E0B")

        api_url = f"http://localhost:5000/srs/request/pending/{prof_id}"
        data = None
        try:
            response = requests.get(api_url, timeout=2)
            
            if response.status_code == 200:
                data = response.json()
                
                # ถ้ามีงาน (data ไม่เป็น None) และเป็นงานใหม่ (ID ไม่ซ้ำเดิม)
                if data and data.get('requestId') != self.last_notified_id:
                    self.last_notified_id = data.get('requestId')
                    self.trigger_alert(data)
                    
        except Exception as e:
            print(f"Polling error: {e}")

        self.after(3000, self.poll_for_requests)

    def trigger_alert(self, data):
        from alert import IncomingAlert # Import class ที่เราแยกไฟล์ไว้
        
        alert = IncomingAlert(
            self, 
            data=data, 
            on_accept=lambda: self.controller.show_frame("ExecutionPage", data=data),
            on_reject=self.handle_reject
        )
    
    def handle_reject(self):
        req_id = self.last_notified_id
        api_url = f"http://localhost:5000/srs/request/update-status/{req_id}"
        
        try:
            requests.put(api_url, json={"status": "Rejected"})
            messagebox.showinfo("สำเร็จ", "ปฏิเสธคำร้องเรียบร้อยแล้ว")
        except:
            pass
    
    