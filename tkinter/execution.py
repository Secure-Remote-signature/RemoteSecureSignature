import tkinter as tk
from tkinter import ttk, messagebox

class ExecutionPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#0F172A")
        self.controller = controller
        self.progress_value = 0

        self.setup_ui()

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