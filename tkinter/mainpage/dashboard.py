import tkinter as tk
from tkinter import messagebox, ttk
import requests
from userSigning.alert import IncomingAlert
from app_config import build_api_url

class DashboardPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.prof_id = None
        
        self.last_notified_id = None
        self.polling_id = None
        
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
        
        tk.Label(content_frame, text="Waiting for new signature requests...", 
                                font=("Arial", 18), bg="#F9FAFB", fg="#64748B").pack(pady=20)

        # View History Button
        tk.Button(self, text="View Signing History", font=("Arial", 16, "underline"), 
            bg="#F9FAFB", fg="#4F46E5", bd=0, cursor="hand2",
            command=lambda: controller.show_frame("HistoryPage")).pack(side="bottom", pady=30)

        
    def update_user_info(self):
        self.stop_polling()
        self.last_notified_id = None
        
        if hasattr(self.controller, 'current_user_id'):
            self.prof_id = self.controller.current_user_id
            print(f"DEBUG: Dashboard ได้รับ ID อาจารย์แล้ว: {self.prof_id}")

        if hasattr(self.controller, 'current_user'):
            self.user_lbl.config(text=f"Welcome, {self.controller.current_user}")
        
        # เมื่อกลับมา dashboard ให้เริ่ม polling ใหม่
        self.poll_for_requests()
  
    def poll_for_requests(self):
        if self.prof_id is None:
            self.polling_id = self.after(3000, self.poll_for_requests)
            return

        try:
            url = build_api_url("/srs/request/claim-next")
            payload = {
                "ownerRequestID": self.prof_id,
                "claimerId": self.prof_id
            }
            response = requests.post(url, json=payload, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                
                if data and "requestId" in data:
                    request_id = data.get('requestId')
                    if request_id != self.last_notified_id:
                        self.last_notified_id = request_id
                        print(f"✅ Claimed คำร้องใหม่จากคุณ: {data.get('studentName')} (requestId={request_id})")
                        self.trigger_alert(data)
                else:
                    print(f"😴 ID {self.prof_id}: ยังไม่มีคำร้องใหม่...")
            elif response.status_code == 409:
                print("⚠️ Claim conflict - จะลองใหม่รอบถัดไป")
            else:
                print(f"⚠️ claim-next failed: HTTP {response.status_code}")
                    
        except Exception as e:
            print(f"❌ Connection Error: {e}")

        self.polling_id = self.after(3000, self.poll_for_requests)
    
    def stop_polling(self):
        if self.polling_id:
            self.after_cancel(self.polling_id)
            self.polling_id = None
            print("⏹️ Polling stopped")

    def trigger_alert(self, data):
        self.last_notified_id = data.get('requestId') 
        alert = IncomingAlert(
            self, 
            data=data, 
            on_accept=lambda: self.controller.show_frame("SignaturePage", data=data),
            on_reject=lambda: self.handle_reject(data),
            on_view=lambda: self.controller.show_frame("DocumentReviewPage", data=data)
        ) 

    def accept_action(self, data):
        self.controller.show_frame("ExecutionPage", data=data)
    
    def handle_reject(self, data):
        req_id = data.get('requestId')
        api_url = build_api_url(f"/srs/request/update-status/{req_id}")
        
        try:
            res = requests.put(api_url, json={"status": "Rejected"}, timeout=3)
            if res.status_code == 200:
                messagebox.showinfo("สำเร็จ", "ปฏิเสธคำร้องแล้ว")
            else:
                print(f"Update failed: {res.status_code}")
        except Exception as e:
            print(f"Error rejecting: {e}")
    
    