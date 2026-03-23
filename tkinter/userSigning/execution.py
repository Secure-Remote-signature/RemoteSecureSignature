import tkinter as tk
from tkinter import ttk, messagebox
import requests

class ExecutionPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#111827")
        self.controller = controller
        self.current_request = {} 
        self.sim_win = None
        self.signature_points = []
        self.sign_command_sent = False

        self.setup_ui()
        self.setup_canvas_events()

    def setup_ui(self):
        # --- 1. Top Status Bar ---
        top_bar = tk.Frame(self, bg="#1E293B", height=60)
        top_bar.pack(side="top", fill="x")
        
        self.status_lbl = tk.Label(top_bar, text="● SYSTEM READY...", font=("Arial", 14, "bold"), 
        bg="#1E293B", fg="#10B981")
        self.status_lbl.pack(side="left", padx=20, pady=15)

        tk.Button(top_bar, text="← กลับหน้าหลัก", bg="#334155", fg="white", relief="flat",
              command=lambda: self.controller.show_frame("DashboardPage")).pack(side="right", padx=16)

        # --- 2. Main Layout ---
        main_container = tk.Frame(self, bg="#111827")
        main_container.pack(fill="both", expand=True, padx=20, pady=10)

        # --- กล้องเฝ้าหน้างาน CNC ---
        sig_frame = tk.LabelFrame(main_container, text=" กล้องเฝ้าหน้างาน CNC ", bg="#111827", fg="white")
        sig_frame.pack(fill="both", expand=True, padx=10)

        self.camera_view = tk.Canvas(sig_frame, bg="#000000", width=400, height=450)
        self.camera_view.pack(fill="both", expand=True, pady=10, padx=10)
        self.show_camera_placeholder("รอเริ่มงานลงนาม")

        tk.Button(sig_frame, text="REFRESH VIEW", bg="#64748B", fg="white", font=("Arial", 11),
              command=self.refresh_camera_view).pack(fill="x", padx=10, pady=5)

        # --- 3. Bottom Control Buttons ---
        btn_frame = tk.Frame(self, bg="#111827")
        btn_frame.pack(side="top", pady=10)

        self.start_btn = tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 12, "bold"),
              padx=20, pady=10, command=self.start_signing)
        self.start_btn.pack(side="left", padx=10)
        
        tk.Button(btn_frame, text="CANCEL", bg="#EF4444", fg="white", font=("Arial", 12, "bold"), padx=20, pady=10,
                  command=lambda: self.controller.show_frame("DashboardPage")).pack(side="left", padx=10)

        tk.Button(btn_frame, text="ปฏิเสธการลงนาม", bg="#EF4444", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.reject_this_request).pack(side="left", padx=10)

        # --- 4. Progress Area ---
        bottom_frame = tk.Frame(self, bg="#0F172A", height=60)
        bottom_frame.pack(side="bottom", fill="x", padx=40, pady=(0, 20))
        
        self.progress = ttk.Progressbar(bottom_frame, orient="horizontal", length=100, mode="determinate")
        self.progress.pack(side="left", fill="x", expand=True, padx=20)

        tk.Button(bottom_frame, text="EMERGENCY STOP", bg="#EF4444", fg="white", font=("Arial", 10, "bold"),
                  command=self.emergency_stop).pack(side="right", padx=10)

    # --- ระบบภาพกล้อง (Execution Monitor) ---
    def setup_canvas_events(self):
        return

    def show_camera_placeholder(self, text):
        self.camera_view.delete("all")
        self.camera_view.create_text(200, 200, text="CNC LIVE MONITOR", 
                                     font=("Arial", 16, "bold"), fill="#94A3B8")
        self.camera_view.create_text(200, 240, text=text, 
                                     font=("Arial", 11), fill="#E2E8F0")

    def refresh_camera_view(self):
        rtsp = self.current_request.get("requestRTSP") if self.current_request else None
        if rtsp and rtsp != "none":
            self.show_camera_placeholder(f"กำลังเฝ้าภาพจาก: {rtsp}")
        else:
            self.show_camera_placeholder("ไม่พบ RTSP - แสดงหน้าจอเฝ้าดูสถานะแทน")

    def set_request_data(self, data):
        if data and "request" in data:
            self.current_request = data.get("request") or {}
            self.signature_points = data.get("points_px") or []
        else:
            self.current_request = data or {}
            self.signature_points = (data or {}).get("points_px") or []

        self.sign_command_sent = False
        self.running_signing = False
        print(f"Execution Page: ได้รับ data request - {self.current_request}")
        self.refresh_camera_view()
    
    
    def cleanup_modals(self):
        if self.sim_win:
            try:
                self.sim_win.destroy()
                self.sim_win = None
            except:
                pass

    def start_signing(self):
        if self.running_signing:
            return

        # mark as running and disable the start button to avoid rapid re-entry
        self.running_signing = True
        try:
            if hasattr(self, 'start_btn'):
                try:
                    self.start_btn.config(state="disabled")
                except:
                    pass

            if not self.current_request:
                messagebox.showwarning("Warning", "ไม่พบข้อมูลงานลงนาม", parent=self.winfo_toplevel())
                return

            if not self.signature_points:
                messagebox.showwarning("Warning", "ไม่พบพิกัดลายเซ็น กรุณากลับไปยืนยันจากหน้า Preview", parent=self.winfo_toplevel())
                return

            if not self.sign_command_sent:
                payload = {
                    "requestId": self.current_request.get('requestId'),
                    "points_px": self.signature_points
                }
                try:
                    res = requests.post("http://localhost:5000/srs/request/confirm-signature", json=payload, timeout=8)
                    if res.status_code != 200:
                        messagebox.showerror("Error", f"ส่งคำสั่งลงนามไม่สำเร็จ (HTTP {res.status_code})", parent=self.winfo_toplevel())
                        return
                    self.sign_command_sent = True
                except Exception as e:
                    messagebox.showerror("Error", f"ส่งคำสั่งลงนามไม่สำเร็จ: {e}", parent=self.winfo_toplevel())
                    return

            self.status_lbl.config(text="● EXECUTING CNC...", fg="#F59E0B")
            self.progress['value'] = 0
            self.run_progress()
        finally:
            # If we returned early (before run_progress started) ensure running flag and button reset
            # run_progress will clear running_signing and re-enable the button when finishing normally
            if self.progress['value'] == 0 and not self.sign_command_sent:
                self.running_signing = False
                if hasattr(self, 'start_btn'):
                    try:
                        self.start_btn.config(state="normal")
                    except:
                        pass

    def run_progress(self):
        if self.progress['value'] < 100:
            self.progress['value'] += 5
            self.after(100, self.run_progress)
        else:
            self.status_lbl.config(text="● FINISHED", fg="#10B981")
            try:
                # close any simulation/preview modal so the messagebox appears on top
                try:
                    self.cleanup_modals()
                except:
                    pass
                messagebox.showinfo("Success", "CNC Signing Completed!", parent=self.winfo_toplevel())
            finally:
                # allow starting again
                self.running_signing = False
                if hasattr(self, 'start_btn'):
                    try:
                        self.start_btn.config(state="normal")
                    except:
                        pass
            
    def reject_this_request(self):
        if messagebox.askyesno("ยืนยัน", "คุณต้องการปฏิเสธคำร้องนี้ใช่หรือไม่?", parent=self.winfo_toplevel()):
            req_id = self.current_request.get('requestId')
            url = f"http://localhost:5000/srs/request/update-status/{req_id}"
            try:
                requests.put(url, json={"status": "Rejected"})
                self.controller.show_frame("DashboardPage")
            except:
                messagebox.showerror("Error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", parent=self.winfo_toplevel())

    def emergency_stop(self):
        self.status_lbl.config(text="● HALTED", fg="#EF4444")
        self.show_camera_placeholder("หยุดฉุกเฉินแล้ว - โปรดตรวจสอบเครื่อง CNC")
        # stop any running signing process and re-enable start button
        self.running_signing = False
        if hasattr(self, 'start_btn'):
            try:
                self.start_btn.config(state="normal")
            except:
                pass
        messagebox.showwarning("Emergency", "CNC Machine Stopped!", parent=self.winfo_toplevel())