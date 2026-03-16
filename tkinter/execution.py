import tkinter as tk
from tkinter import ttk, messagebox
import json
import requests
from PIL import Image, ImageTk, ImageDraw
from io import BytesIO

class ExecutionPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#111827")
        self.controller = controller
        self.paths = []
        self.orig_img = None
        self.current_doc = {}
        self.current_request = {}

        self.setup_ui()

    def setup_ui(self):
        # --- 1. Top Status Bar ---
        top_bar = tk.Frame(self, bg="#1E293B", height=60)
        top_bar.pack(side="top", fill="x")
        
        self.status_lbl = tk.Label(top_bar, text="● SYSTEM READY...", font=("Arial", 14, "bold"), 
                                   bg="#1E293B", fg="#10B981") # Green dot for active
        self.status_lbl.pack(side="left", padx=20, pady=15)

        # --- 2. Info Label ---
        self.info_label = tk.Label(self, text="รอรับข้อมูลเอกสาร...", font=("Arial", 12), bg="#111827", fg="white")
        self.info_label.pack(pady=10)

        # --- 3. Main Content: Camera / Document View ---
        self.camera_view = tk.Canvas(self, bg="#0F172A", highlightthickness=1, highlightbackground="#334155")
        self.camera_view.pack(fill="both", expand=True, padx=40, pady=10)
        self.camera_view.create_text(450, 200, text="[ แสดงภาพเอกสาร / LIVE CAMERA ]", 
                                     font=("Arial", 20, "bold"), fill="#475569", tags="placeholder")

        # --- 4. ปุ่มควบคุมหลัก ---
        btn_frame = tk.Frame(self, bg="#111827")
        btn_frame.pack(pady=10)

        tk.Button(btn_frame, text="SHOW SIMULATION", bg="#3B82F6", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.show_simulation).pack(side="left", padx=10)

        tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.start_signing).pack(side="left", padx=10)
        
        tk.Button(btn_frame, text="CANCEL", bg="#64748B", fg="white", font=("Arial", 12, "bold"), padx=20, pady=10,
                  command=lambda: self.controller.show_frame("DashboardPage")).pack(side="left", padx=10)

        # --- 5. Control & Progress Area (Bottom) ---
        bottom_frame = tk.Frame(self, bg="#0F172A", height=100)
        bottom_frame.pack(side="bottom", fill="x", padx=40, pady=(0, 20))

        progress_frame = tk.Frame(bottom_frame, bg="#0F172A")
        progress_frame.pack(side="left", fill="both", expand=True, padx=(0, 20))

        tk.Label(progress_frame, text="Signing Progress:", font=("Arial", 12), 
                 bg="#0F172A", fg="#94A3B8").pack(anchor="w", pady=(0, 5))
        
        self.style = ttk.Style()
        self.style.configure("TProgressbar", thickness=20)
        self.progress = ttk.Progressbar(progress_frame, orient="horizontal", 
                                        length=100, mode="determinate", style="TProgressbar")
        self.progress.pack(fill="x", ipady=5)

        self.stop_btn = tk.Button(bottom_frame, text="EMERGENCY\nSTOP", font=("Arial", 14, "bold"), 
                                  bg="#EF4444", fg="#FFFFFF", activebackground="#B91C1C", 
                                  relief="flat", width=15, height=2, command=self.emergency_stop)
        self.stop_btn.pack(side="right", pady=10)

    def set_request_data(self, data):
        """รับข้อมูลจาก Dashboard/Alert มาโชว์ในหน้านี้"""
        self.current_request = data
        self.info_label.config(text=f"กำลังดำเนินการ: {data['studentName']}\nเรื่อง: {data['requestNumber']}")        
        
        # เรียกฟังก์ชันโหลดรูป (ใช้ชื่อไฟล์ที่ส่งมาจาก Database)
        if 'requestPicture' in data:
            self.load_original_document(data['requestPicture'])
        
    def load_original_document(self, filename):
        """โหลดรูปภาพจาก Server มาเก็บไว้ในตัวแปรและแสดงผลบน UI"""
        # สร้าง URL ให้ตรงกับโฟลเดอร์ uploads ของ Node.js
        img_url = f"http://localhost:5000/uploads/{filename}"

        try:
            # 1. ดึงข้อมูลภาพจาก URL
            response = requests.get(img_url, timeout=10)
            
            if response.status_code == 200:
                # 2. แปลงข้อมูล Bytes ให้เป็นรูปภาพด้วย Pillow
                img_data = BytesIO(response.content)
                self.orig_img = Image.open(img_data)
                
                # 3. ปรับขนาดรูปให้พอดีกับหน้าจอ (เพื่อพรีวิว)
                # สมมติว่าอยากให้กว้างสูงสุด 500px แต่รักษาสัดส่วนเดิมไว้
                display_img = self.orig_img.copy()
                display_img.thumbnail((500, 400)) # ปรับขนาดพรีวิว
                
                self.tk_img = ImageTk.PhotoImage(display_img)
                
                # 4. เอาไปแปะแทนที่ Placeholder สีเทา
                self.image_label.config(image=self.tk_img, text="") # ลบตัวหนังสือ Placeholder ออก
                print(f"✅ Loaded document: {filename}")
            else:
                print(f"❌ Failed to load image: Status {response.status_code}")
                self.image_label.config(text="[ ไม่สามารถโหลดรูปภาพได้ ]")
                
        except Exception as e:
            print(f"⚠️ Error loading document: {e}")
            self.image_label.config(text="[ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ]")

    def show_image_on_canvas(self, img):
        """ย่อรูปและแสดงบนหน้าจอหลัก"""
        self.camera_view.delete("all")
        cw, ch = 900, 400 # ขนาดประมาณการของ Canvas
        img_copy = img.copy()
        img_copy.thumbnail((cw, ch), Image.Resampling.LANCZOS)
        
        self.tk_main_img = ImageTk.PhotoImage(img_copy)
        self.camera_view.create_image(cw//2, ch//2, image=self.tk_main_img, anchor=tk.CENTER)

    def show_simulation(self):
        """คำนวณพิกัดลายเซ็นแบบรักษาสัดส่วน และเตรียมรูปพรีวิว"""
        if not self.orig_img:
            messagebox.showwarning("คำเตือน", "ไม่มีเอกสารต้นฉบับให้ประมวลผล")
            return
        if not self.paths: 
            messagebox.showwarning("คำเตือน", "กรุณาเซ็นชื่อ หรือจำลองเส้นก่อนครับ (self.paths ว่างเปล่า)")
            return
            
        sim_img = self.orig_img.copy()
        draw = ImageDraw.Draw(sim_img)
        area = self.current_doc.get('signatureArea', {"x":0, "y":0, "width":100, "height":100})
        
        all_pts = [pt for path in self.paths for pt in path]
        if not all_pts: return

        min_px, max_px = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
        min_py, max_py = min(p[1] for p in all_pts), max(p[1] for p in all_pts)
        
        sig_w = max_px - min_px
        sig_h = max_py - min_py

        if sig_w == 0 or sig_h == 0:
            messagebox.showwarning("คำเตือน", "ลายเซ็นมีขนาดเล็กเกินไป")
            return

        scale_x = area['width'] / sig_w
        scale_y = area['height'] / sig_h
        scale = min(scale_x, scale_y) * 0.8 

        target_center_x = area['x'] + (area['width'] / 2)
        target_center_y = area['y'] + (area['height'] / 2)
        sig_center_x = (min_px + max_px) / 2
        sig_center_y = (min_py + max_py) / 2

        for path in self.paths:
            mapped_path = []
            for px, py in path:
                mx = target_center_x + (px - sig_center_x) * scale
                my = target_center_y + (py - sig_center_y) * scale
                mapped_path.append((mx, my))
            
            if len(mapped_path) > 1:
                draw.line(mapped_path, fill="blue", width=5)

        # เพิ่มกรอบสี่เหลี่ยมสีแดงแสดง Area สำหรับ Preview
        draw.rectangle([area['x'], area['y'], area['x']+area['width'], area['y']+area['height']], outline="red", width=2)

        self.display_preview(sim_img)

    def display_preview(self, sim_img):
        """หน้าต่าง Preview ที่ล็อคปุ่มไว้ด้านล่าง"""
        self.sim_win = tk.Toplevel(self) # แก้จาก self.root เป็น self
        self.sim_win.title("Preview ก่อนส่ง CNC")
        self.sim_win.geometry("700x500") 
        self.sim_win.configure(bg="#0F172A")

        bottom_frame = tk.Frame(self.sim_win, bg="#0F172A")
        bottom_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=10)
        
        tk.Button(bottom_frame, text="✅ ยืนยันพิกัดและสร้างไฟล์ JSON", 
                  bg="#10B981", fg="white", font=("Arial", 12, "bold"), 
                  padx=20, pady=10, command=self.confirm_and_save_json
                 ).pack(fill=tk.X, padx=20)

        top_bar = tk.Frame(self.sim_win, bg="#1E293B")
        top_bar.pack(side=tk.TOP, fill=tk.X)
        
        self.sim_zoom = 0.5
        self.sim_full_img = sim_img

        z_ctrl = tk.Frame(top_bar, bg="#1E293B")
        z_ctrl.pack(side=tk.RIGHT, padx=10, pady=5)
        
        def adjust_zoom(d):
            self.sim_zoom = max(0.1, self.sim_zoom + d)
            render_view()

        tk.Button(z_ctrl, text="-", command=lambda: adjust_zoom(-0.1), width=4).pack(side=tk.LEFT, padx=2)
        tk.Button(z_ctrl, text="+", command=lambda: adjust_zoom(0.1), width=4).pack(side=tk.LEFT, padx=2)

        self.sim_canvas = tk.Canvas(self.sim_win, bg="#111827", highlightthickness=0)
        self.sim_canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        def render_view():
            sw, sh = self.sim_full_img.size
            new_s = (int(sw * self.sim_zoom), int(sh * self.sim_zoom))
            resized = self.sim_full_img.resize(new_s, Image.Resampling.LANCZOS)
            self.tk_sim_img = ImageTk.PhotoImage(resized)
            self.sim_canvas.delete("all")
            self.sim_canvas.create_image(0, 0, image=self.tk_sim_img, anchor=tk.NW)
            self.sim_canvas.config(scrollregion=(0, 0, new_s[0], new_s[1]))

        self.sim_canvas.bind("<Button-1>", lambda e: self.sim_canvas.scan_mark(e.x, e.y))
        self.sim_canvas.bind("<B1-Motion>", lambda e: self.sim_canvas.scan_dragto(e.x, e.y, gain=1))

        render_view()

    def confirm_and_send_api(self):
        """คำนวณพิกัดและส่งข้อมูลไปยัง Server แทนการเซฟไฟล์"""
        if not self.paths: 
            messagebox.showwarning("คำเตือน", "ไม่พบข้อมูลลายเซ็น")
            return

        # --- 1. ส่วนการคำนวณพิกัด (ใช้ Logic เดิมที่คุณเขียนไว้เป๊ะๆ) ---
        area = self.current_doc.get('signatureArea', {"x": 0, "y": 0, "width": 100, "height": 100})
        all_pts = [pt for path in self.paths for pt in path]
        min_px, max_px = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
        min_py, max_py = min(p[1] for p in all_pts), max(p[1] for p in all_pts)
        sig_w, sig_h = max_px - min_px, max_py - min_py
        
        scale = min(area['width']/sig_w, area['height']/sig_h) * 0.8
        target_cx, target_cy = area['x'] + (area['width']/2), area['y'] + (area['height']/2)
        sig_cx, sig_cy = (min_px + max_px)/2, (min_py + max_py)/2

        # เตรียมข้อมูลในรูปแบบ List
        points_px = []
        for path in self.paths:
            current_path = []
            for px, py in path:
                mx = target_cx + (px - sig_cx) * scale
                my = target_cy + (py - sig_cy) * scale
                current_path.append({"x": round(mx, 2), "y": round(my, 2)})
            points_px.append(current_path)

        # --- 2. ส่วนการส่งข้อมูลผ่าน API ---
        payload = {
            "requestId": self.current_doc['requestId'], # ส่ง ID ไปอ้างอิง
            "points_px": points_px                      # ส่งพิกัดทั้งหมดไป
        }

        api_url = "http://localhost:5000/srs/request/confirm-signature"

        try:
            response = requests.post(api_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                messagebox.showinfo("สำเร็จ", "ส่งลายเซ็นไปที่ระบบเรียบร้อยแล้ว!")
                if hasattr(self, 'sim_win'): self.sim_win.destroy() # ปิดหน้าต่าง Preview
                self.controller.show_frame("DashboardPage")        # กลับหน้าหลัก
            else:
                messagebox.showerror("ผิดพลาด", f"เซิร์ฟเวอร์ตอบกลับผิดปกติ: {response.status_code}")
                
        except Exception as e:
            messagebox.showerror("Error", f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {e}")
    
    def start_signing(self):
        """เริ่มกระบวนการเซ็นจริง"""
        self.status_lbl.config(text="● EXECUTING CNC...", fg="#F59E0B")
        self.progress_value = 0
        self.update_progress()

    def update_progress(self):
        """จำลองการขยับของ Progress bar"""
        if self.progress_value < 100:
            self.progress_value += 2
            self.progress['value'] = self.progress_value
            self.after(100, self.update_progress) # อัพเดตทุกๆ 0.1 วินาที
        else:
            self.status_lbl.config(text="● SIGNING COMPLETED", fg="#60A5FA")
            messagebox.showinfo("Success", "ส่งคำสั่งและเซ็นเอกสารเรียบร้อยแล้ว!")
            self.controller.show_frame("DashboardPage")

    def emergency_stop(self):
        """หยุดการทำงานทุกอย่างทันที"""
        self.status_lbl.config(text="● HALTED", fg="#EF4444")
        self.progress_value = 100 # หยุด progress
        messagebox.showerror("EMERGENCY STOP", "CNC Machine has been halted!")
        self.controller.show_frame("DashboardPage")