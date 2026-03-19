import tkinter as tk
from tkinter import ttk, messagebox
import requests
from PIL import Image, ImageTk, ImageDraw
from io import BytesIO

class ExecutionPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#111827")
        self.controller = controller
        self.zoom_scale = 1.0
        self.tk_img = None
        self.paths = []  
        self.current_path = []   
        self.orig_img = None
        self.current_request = {} 
        self.sim_win = None  # เก็บ reference ของ preview window
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

        # --- 2. Main Layout (แบ่งซ้าย-ขวา) ---
        main_container = tk.Frame(self, bg="#111827")
        main_container.pack(fill="both", expand=True, padx=20, pady=10)

        # --- ฝั่งขวา: CNC Monitor ---
        sig_frame = tk.LabelFrame(main_container, text=" กล้องเฝ้าหน้างาน CNC ", bg="#111827", fg="white")
        sig_frame.pack(side="full", fill="both", padx=10)

        self.camera_view = tk.Canvas(sig_frame, bg="#000000", width=400, height=450)
        self.camera_view.pack(pady=10, padx=10)
        self.show_camera_placeholder("รอเริ่มงานลงนาม")

        tk.Button(sig_frame, text="REFRESH VIEW", bg="#64748B", fg="white", font=("Arial", 11),
              command=self.refresh_camera_view).pack(fill="x", padx=10, pady=5)

        # --- 3. Bottom Control Buttons ---
        btn_frame = tk.Frame(self, bg="#111827")
        btn_frame.pack(side="top", pady=10)

        tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.start_signing).pack(side="left", padx=10)
        
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

    # --- ระบบจัดการเอกสาร (Document) ---
    def load_original_document(self, filename):
        img_url = f"http://localhost:5000/uploads/{filename}"
        print(f"🔄 กำลังโหลดเอกสารจาก: {img_url}")
        try:
            response = requests.get(img_url, timeout=10)
            print(f"Response Status: {response.status_code}")
            if response.status_code == 200:
                raw_img = Image.open(BytesIO(response.content))
                self.orig_img = raw_img.transpose(Image.ROTATE_90)
                # ให้ scheduler เรียก auto_fit_zoom หลังจาก canvas render เสร็จ
                self.after(100, self.auto_fit_zoom)
                print(f"✅ Loaded and Rotated Portrait: {filename}")
            else:
                print(f"❌ ไฟล์ไม่พบ (Status {response.status_code})")
                self.show_error_placeholder(f"ไฟล์ไม่พบ (HTTP {response.status_code})")
        except requests.exceptions.Timeout:
            print(f"❌ Timeout: เซิร์ฟเวอร์ไม่ตอบสนอง")
            self.show_error_placeholder("Timeout: เซิร์ฟเวอร์ไม่ตอบสนอง")
        except Exception as e:
            print(f"❌ Error loading: {e}")
            self.show_error_placeholder(f"Error: {str(e)[:50]}")

    def show_error_placeholder(self, error_msg):
        self.canvas.delete("all")
        self.canvas.create_text(400, 300, text=error_msg, 
                               font=("Arial", 14, "bold"), fill="#EF4444", tags="error_text")

    def set_request_data(self, data):
        if data and "request" in data:
            self.current_request = data.get("request") or {}
            self.signature_points = data.get("points_px") or []
        else:
            self.current_request = data or {}
            self.signature_points = (data or {}).get("points_px") or []

        self.sign_command_sent = False
        print(f"Execution Page: ได้รับ data request - {self.current_request}")
        filename = self.current_request.get('requestPicture') or self.current_request.get('docFileName', 'document.pdf')
        print(f"ชื่อไฟล์หลัก: {filename}")
        self.load_original_document(filename)
        self.refresh_camera_view()
        print(f"ExecutionPage loaded request: {self.current_request.get('requestId')}, Doc: {filename}")
    
    def cleanup_modals(self):
        """ปิด modal windows ใด ๆ ที่ค้างอยู่"""
        if self.sim_win:
            try:
                self.sim_win.destroy()
                self.sim_win = None
            except:
                pass

    def adjust_zoom(self, delta):
        self.zoom_scale = max(0.2, min(1.0, self.zoom_scale + delta))  # ลิมิต 0.2 ถึง 1.0
        self.render_image()

    def reset_zoom(self):
        self.zoom_scale = 0.5 
        self.auto_fit_zoom()
    
    def auto_fit_zoom(self):
        if not self.orig_img:
            return
        
        canvas_width = self.canvas.winfo_width() - 20
        canvas_height = self.canvas.winfo_height() - 20
        print(f"DEBUG: canvas_width={canvas_width}, canvas_height={canvas_height}")
        
        # ถ้า canvas ยังไม่ render ให้ใช้ค่า default
        if canvas_width <= 1 or canvas_height <= 1:
            canvas_width = 760
            canvas_height = 460
            print(f"Using default canvas: {canvas_width}x{canvas_height}")
        
        img_width, img_height = self.orig_img.size
        print(f"DEBUG: img_width={img_width}, img_height={img_height}")
        
        zoom_w = canvas_width / img_width
        zoom_h = canvas_height / img_height
        # ลิมิต zoom ให้สูงสุด 1.0 (100%)
        self.zoom_scale = min(min(zoom_w, zoom_h) * 0.98, 1.0)
        print(f"DEBUG: zoom_scale set to {self.zoom_scale} (limited to max 1.0)")
        self.render_image()

    def render_image(self):
        if not self.orig_img: 
            return
        w, h = self.orig_img.size
        new_size = (int(w * self.zoom_scale), int(h * self.zoom_scale))
        resized_img = self.orig_img.resize(new_size, Image.Resampling.LANCZOS)
        self.tk_img = ImageTk.PhotoImage(resized_img) 
        self.canvas.delete("all")
        # วาง image ที่มุมซ้ายบน
        self.canvas.create_image(0, 0, anchor="nw", image=self.tk_img)
        self.canvas.config(scrollregion=(0, 0, new_size[0], new_size[1]))

    def start_signing(self):
        if not self.current_request:
            messagebox.showwarning("Warning", "ไม่พบข้อมูลงานลงนาม")
            return

        if not self.signature_points:
            messagebox.showwarning("Warning", "ไม่พบพิกัดลายเซ็น กรุณากลับไปยืนยันจากหน้า Preview")
            return

        if not self.sign_command_sent:
            payload = {
                "requestId": self.current_request.get('requestId'),
                "points_px": self.signature_points
            }
            try:
                res = requests.post("http://localhost:5000/srs/request/confirm-signature", json=payload, timeout=8)
                if res.status_code != 200:
                    messagebox.showerror("Error", f"ส่งคำสั่งลงนามไม่สำเร็จ (HTTP {res.status_code})")
                    return
                self.sign_command_sent = True
            except Exception as e:
                messagebox.showerror("Error", f"ส่งคำสั่งลงนามไม่สำเร็จ: {e}")
                return

        self.status_lbl.config(text="● EXECUTING CNC...", fg="#F59E0B")
        self.progress['value'] = 0
        self.run_progress()

    def run_progress(self):
        if self.progress['value'] < 100:
            self.progress['value'] += 5
            self.after(100, self.run_progress)
        else:
            self.status_lbl.config(text="● FINISHED", fg="#10B981")
            messagebox.showinfo("Success", "CNC Signing Completed!")
            
    def reject_this_request(self):
        if messagebox.askyesno("ยืนยัน", "คุณต้องการปฏิเสธคำร้องนี้ใช่หรือไม่?"):
            req_id = self.current_request.get('requestId')
            url = f"http://localhost:5000/srs/request/update-status/{req_id}"
            try:
                requests.put(url, json={"status": "Rejected"})
                self.controller.show_frame("DashboardPage")
            except:
                messagebox.showerror("Error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้")

    def emergency_stop(self):
        self.status_lbl.config(text="● HALTED", fg="#EF4444")
        self.show_camera_placeholder("หยุดฉุกเฉินแล้ว - โปรดตรวจสอบเครื่อง CNC")
        messagebox.showwarning("Emergency", "CNC Machine Stopped!")