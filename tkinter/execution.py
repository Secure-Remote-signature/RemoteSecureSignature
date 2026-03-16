import tkinter as tk
from tkinter import ttk, messagebox

class ExecutionPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.current_request = None # เก็บข้อมูล request ที่กำลังทำ

        tk.Label(self, text="📝 Document Execution", font=("Arial", 18, "bold"), bg="#F9FAFB").pack(pady=20)

        # ส่วนแสดงผลรูปภาพเอกสาร (Placeholder)
        self.image_label = tk.Label(self, text="[ รูปภาพเอกสารจะแสดงที่นี่ ]", bg="#E5E7EB", width=60, height=15)
        self.image_label.pack(pady=10)

        # ส่วนแสดงรายละเอียด
        self.info_label = tk.Label(self, text="รอรับข้อมูล...", font=("Arial", 12), bg="#F9FAFB")
        self.info_label.pack(pady=10)

        # ปุ่มควบคุม
        btn_frame = tk.Frame(self, bg="#F9FAFB")
        btn_frame.pack(pady=20)

        tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.start_signing).pack(side="left", padx=10)
        
        tk.Button(btn_frame, text="CANCEL", bg="#64748B", fg="white", padx=20, pady=10,
                  command=lambda: controller.show_frame("DashboardPage")).pack(side="left", padx=10)

        self.setup_ui()

    def set_request_data(self, data):
        """รับข้อมูลจาก Dashboard/Alert มาโชว์ในหน้านี้"""
        self.current_request = data
        self.info_label.config(text=f"กำลังดำเนินการ: {data['studentName']}\nเรื่อง: {data['requestNumber']}")
    
    def start_signing(self):
        req_id = self.current_request['requestId']
        messagebox.showinfo("CNC Status", "ส่งคำสั่งไปที่เครื่อง CNC เรียบร้อยแล้ว!")
        self.controller.show_frame("DashboardPage")

    def setup_ui(self):
        # --- Top Status Bar ---
        top_bar = tk.Frame(self, bg="#1E293B", height=60)
        top_bar.pack(side="top", fill="x")
        
        self.status_lbl = tk.Label(top_bar, text="● SYSTEM EXECUTING...", font=("Arial", 14, "bold"), 
                                   bg="#1E293B", fg="#10B981") # Green dot for active
        self.status_lbl.pack(side="left", padx=20, pady=15)

        # --- Main Content: Live Stream Area ---
        # ตรงนี้คือพื้นที่สำหรับเอา OpenCV หรือ Stream มาแปะ
        self.camera_view = tk.Canvas(self, bg="#111827", highlightthickness=1, highlightbackground="#334155")
        self.camera_view.pack(fill="both", expand=True, padx=40, pady=20)
        
        # Placeholder text for Camera
        self.camera_view.create_text(450, 200, text="[ LIVE CAMERA STREAM ]", 
                                     font=("Arial", 20, "bold"), fill="#475569")

        # --- Control & Progress Area (Bottom) ---
        bottom_frame = tk.Frame(self, bg="#0F172A", height=150)
        bottom_frame.pack(side="bottom", fill="x", padx=40, pady=(0, 40))

        # Progress Bar
        progress_frame = tk.Frame(bottom_frame, bg="#0F172A")
        progress_frame.pack(side="left", fill="both", expand=True, padx=(0, 20))

        tk.Label(progress_frame, text="Signing Progress:", font=("Arial", 12), 
                 bg="#0F172A", fg="#94A3B8").pack(anchor="w", pady=(0, 5))
        
        self.style = ttk.Style()
        self.style.configure("TProgressbar", thickness=20)
        self.progress = ttk.Progressbar(progress_frame, orient="horizontal", 
                                        length=100, mode="determinate", style="TProgressbar")
        self.progress.pack(fill="x", ipady=5)

        # Emergency Stop Button (The most important button)
        self.stop_btn = tk.Button(bottom_frame, text="EMERGENCY\nSTOP", font=("Arial", 16, "bold"), 
                                  bg="#EF4444", fg="#FFFFFF", activebackground="#B91C1C", 
                                  relief="flat", width=15, height=3,
                                  command=self.emergency_stop)
        self.stop_btn.pack(side="right")

    def start_simulation(self):
        """เรียกฟังก์ชันนี้เมื่อหน้าจอถูกเปิด เพื่อจำลองการเซ็น"""
        self.progress_value = 0
        self.update_progress()

    def update_progress(self):
        """จำลองการขยับของ Progress bar"""
        if self.progress_value < 100:
            self.progress_value += 1
            self.progress['value'] = self.progress_value
            self.after(100, self.update_progress) # จำลองความเร็ว
        else:
            self.status_lbl.config(text="● SIGNING COMPLETED", fg="#60A5FA")
            messagebox.showinfo("Success", "Document has been signed successfully!")
            self.controller.show_frame("DashboardPage")

    def emergency_stop(self):
        """หยุดการทำงานทุกอย่างทันที"""
        # ในงานจริง: ต้องส่งคำสั่งไปที่ CNC เพื่อหยุดมอเตอร์ (M0 หรือ M112)
        messagebox.showerror("EMERGENCY STOP", "CNC Machine has been halted!")
        self.controller.show_frame("DashboardPage")