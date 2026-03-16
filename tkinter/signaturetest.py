import tkinter as tk
from tkinter import messagebox
import requests
from PIL import Image, ImageTk, ImageOps, ImageDraw
from io import BytesIO
import json
import os

class ProProfessorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Secure Remote Signature - Gallery Mode")
        self.root.geometry("1024x600") # ขนาดมาตรฐานจอ Pi
        self.root.configure(bg="#1E293B")

        self.backend_url = "http://192.168.1.39:5000"
        
        self.current_doc = None
        self.orig_img = None  
        self.paths = []       
        
        # --- ตัวแปรควบคุมรูป (Gallery Logic) ---
        self.zoom_level = 1.0
        self.img_id = None
        self.rect_id = None # สำหรับกรอบแดง
        self.text_id = None

        self.setup_ui()

    def setup_ui(self):
        # Toolbar
        toolbar = tk.Frame(self.root, bg="#0F172A", height=50)
        toolbar.pack(fill=tk.X)
        
        tk.Button(toolbar, text="🔄 ดึงคำร้อง", command=self.fetch_doc, bg="#6366F1", fg="white", font=("Arial", 10, "bold"), padx=15).pack(side=tk.LEFT, padx=10, pady=5)
        
        # ปุ่มควบคุมซูม
        zoom_frame = tk.Frame(toolbar, bg="#0F172A")
        zoom_frame.pack(side=tk.LEFT, padx=20)
        tk.Button(zoom_frame, text=" - ", command=lambda: self.adjust_zoom(-0.1), width=3).pack(side=tk.LEFT)
        self.zoom_lbl = tk.Label(zoom_frame, text="100%", bg="#0F172A", fg="white", width=6)
        self.zoom_lbl.pack(side=tk.LEFT)
        tk.Button(zoom_frame, text=" + ", command=lambda: self.adjust_zoom(0.1), width=3).pack(side=tk.LEFT)

        tk.Button(toolbar, text="▶️ จำลอง CNC", command=self.show_simulation, bg="#10B981", fg="white", font=("Arial", 10, "bold")).pack(side=tk.LEFT, padx=20)
        tk.Button(toolbar, text="ล้างลายเซ็น", command=self.clear_sign, bg="#EF4444", fg="white").pack(side=tk.RIGHT, padx=10)

        # Main Split Screen
        self.paned_window = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, bg="#334155", sashwidth=6)
        self.paned_window.pack(fill=tk.BOTH, expand=True)

        # ฝั่งซ้าย: Document Viewer (แบบเลื่อนได้อิสระ)
        self.left_frame = tk.Frame(self.paned_window, bg="#000000")
        self.left_canvas = tk.Canvas(self.left_frame, bg="#000000", highlightthickness=0)
        self.left_canvas.pack(fill=tk.BOTH, expand=True)
        self.paned_window.add(self.left_frame, width=500)

        # ฝั่งขวา: Signature Pad
        self.right_frame = tk.Frame(self.paned_window, bg="white")
        tk.Label(self.right_frame, text="เซ็นชื่อในกรอบนี้", bg="white", font=("Arial", 11)).pack(pady=5)
        self.right_canvas = tk.Canvas(self.right_frame, bg="#F1F5F9", bd=2, relief=tk.RIDGE)
        self.right_canvas.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)
        self.paned_window.add(self.right_frame, width=500)

        # --- Event Bindings ---
        # ฝั่งขวา: วาดรูป
        self.right_canvas.bind("<Button-1>", self.start_draw)
        self.right_canvas.bind("<B1-Motion>", self.draw)
        
        # ฝั่งซ้าย: การลากรูป (Panning)
        self.left_canvas.bind("<Button-1>", lambda e: self.left_canvas.scan_mark(e.x, e.y))
        self.left_canvas.bind("<B1-Motion>", lambda e: self.left_canvas.scan_dragto(e.x, e.y, gain=1))
        
        # การซูมด้วย MouseWheel (ถ้ามี)
        self.left_canvas.bind("<MouseWheel>", self.handle_mouse_zoom)
        self.left_canvas.bind("<Button-4>", self.handle_mouse_zoom)
        self.left_canvas.bind("<Button-5>", self.handle_mouse_zoom)

    def fetch_doc(self):
        try:
            res = requests.get(f"{self.backend_url}/api/pending-docs")
            docs = res.json()
            if not docs: return
            
            self.current_doc = docs[-1]
            img_res = requests.get(f"{self.backend_url}/uploads/{self.current_doc['imagePath']}")
            self.orig_img = ImageOps.exif_transpose(Image.open(BytesIO(img_res.content)))
            
            # --- คำนวณ Zoom to Fit (เริ่มต้นให้เห็นรูปทั้งหมด) ---
            self.root.update()
            canvas_w = self.left_canvas.winfo_width()
            canvas_h = self.left_canvas.winfo_height()
            img_w, img_h = self.orig_img.size
            
            # หาค่าซูมที่ทำให้เห็นรูปครบใบ
            self.zoom_level = min(canvas_w/img_w, canvas_h/img_h)
            
            self.render_left_canvas()
            self.clear_sign()
        except Exception as e:
            messagebox.showerror("Error", f"ดึงข้อมูลไม่ได้: {e}")

    def render_left_canvas(self):
        if not self.orig_img: return
        
        # 1. ปรับขนาดรูปตาม zoom_level
        w, h = self.orig_img.size
        new_size = (int(w * self.zoom_level), int(h * self.zoom_level))
        resized = self.orig_img.resize(new_size, Image.Resampling.LANCZOS)
        self.tk_left_img = ImageTk.PhotoImage(resized)
        
        # 2. ลบของเก่าและวาดใหม่
        self.left_canvas.delete("all")
        # วาดรูปไว้ที่ 0,0 ของ scrollregion
        self.img_id = self.left_canvas.create_image(0, 0, image=self.tk_left_img, anchor=tk.NW)
        
        # 3. อัปเดตพื้นที่เลื่อน (Scroll Region) ให้เท่ากับขนาดรูปที่ขยายแล้ว
        self.left_canvas.config(scrollregion=(0, 0, new_size[0], new_size[1]))

        # 4. วาดกรอบแดง Signature Box
        area = self.current_doc['signatureArea']
        if area:
            x = area['x'] * self.zoom_level
            y = area['y'] * self.zoom_level
            sw = area['width'] * self.zoom_level
            sh = area['height'] * self.zoom_level
            self.left_canvas.create_rectangle(x, y, x+sw, y+sh, outline="#F87171", width=3, dash=(8,4))
            self.left_canvas.create_text(x, y-10, text="ตำแหน่งเซ็น", fill="#F87171", font=("Arial", 10, "bold"), anchor="sw")

        # อัปเดตตัวเลขเปอร์เซ็นต์
        self.zoom_lbl.config(text=f"{int(self.zoom_level * 100)}%")

    def adjust_zoom(self, delta):
        self.zoom_level = max(0.1, self.zoom_level + delta)
        self.render_left_canvas()

    def handle_mouse_zoom(self, event):
        if event.num == 4 or event.delta > 0: self.adjust_zoom(0.1)
        else: self.adjust_zoom(-0.1)

    # --- ส่วนการวาด (Signing) ---
    def start_draw(self, event):
        self.paths.append([(event.x, event.y)])

    def draw(self, event):
        if self.paths:
            x1, y1 = self.paths[-1][-1]
            self.right_canvas.create_line(x1, y1, event.x, event.y, width=3, fill="black", capstyle=tk.ROUND, smooth=True)
            self.paths[-1].append((event.x, event.y))

    def clear_sign(self):
        self.right_canvas.delete("all")
        self.paths = []

    def show_simulation(self):
        """คำนวณพิกัดลายเซ็นแบบรักษาสัดส่วน และเตรียมรูปพรีวิว"""
        if not self.orig_img or not self.paths: 
            messagebox.showwarning("คำเตือน", "กรุณาเซ็นชื่อก่อนครับ")
            return
            
        # สร้างรูป Copy สำหรับวาดพรีวิว
        sim_img = self.orig_img.copy()
        draw = ImageDraw.Draw(sim_img)
        area = self.current_doc['signatureArea']
        
        # 1. หา Bounding Box ของลายเซ็น (ตัดพื้นที่ว่างรอบนอกออก)
        all_pts = [pt for path in self.paths for pt in path]
        min_px, max_px = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
        min_py, max_py = min(p[1] for p in all_pts), max(p[1] for p in all_pts)
        
        sig_w = max_px - min_px
        sig_h = max_py - min_py

        # 2. คำนวณ Scale แบบรักษาสัดส่วน (Uniform Scaling)
        scale_x = area['width'] / sig_w if sig_w > 0 else 1
        scale_y = area['height'] / sig_h if sig_h > 0 else 1
        scale = min(scale_x, scale_y) * 0.8 # เผื่อขอบ 20%

        # 3. จุดศูนย์กลางสำหรับการ Mapping
        target_center_x = area['x'] + (area['width'] / 2)
        target_center_y = area['y'] + (area['height'] / 2)
        sig_center_x = (min_px + max_px) / 2
        sig_center_y = (min_py + max_py) / 2

        # 4. วาดเส้นลงบนรูป Simulation
        for path in self.paths:
            mapped_path = []
            for px, py in path:
                mx = target_center_x + (px - sig_center_x) * scale
                my = target_center_y + (py - sig_center_y) * scale
                mapped_path.append((mx, my))
            
            if len(mapped_path) > 1:
                draw.line(mapped_path, fill="black", width=5)

    # ส่งรูปที่วาดเสร็จแล้วไปให้ฟังก์ชันแสดงผล
        self.display_preview(sim_img)

    def display_preview(self, sim_img):
        """หน้าต่าง Preview ที่ล็อคปุ่มไว้ด้านล่าง (ไม่ให้ปุ่มหาย)"""
        self.sim_win = tk.Toplevel(self.root)
        self.sim_win.title("Preview ก่อนส่ง CNC")
        
        # ปรับขนาดให้พอดีจอ Pi (800x480 หรือใกล้เคียง)
        self.sim_win.geometry("700x450") 
        self.sim_win.configure(bg="#0F172A")

        # --- 1. ส่วนล่าง: ล็อคปุ่มยืนยันไว้ที่นี่ก่อนเลย ---
        bottom_frame = tk.Frame(self.sim_win, bg="#0F172A")
        bottom_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=5)
        
        tk.Button(bottom_frame, text="✅ ยืนยันพิกัดและสร้างไฟล์ JSON", 
                  bg="#10B981", fg="white", font=("Arial", 12, "bold"), 
                  padx=20, pady=10, command=self.confirm_and_save_json
                 ).pack(fill=tk.X, padx=20)

        # --- 2. ส่วนบน: แถบเครื่องมือซูม ---
        top_bar = tk.Frame(self.sim_win, bg="#1E293B")
        top_bar.pack(side=tk.TOP, fill=tk.X)
        
        self.sim_zoom = 0.3
        self.sim_full_img = sim_img

        z_ctrl = tk.Frame(top_bar, bg="#1E293B")
        z_ctrl.pack(side=tk.RIGHT, padx=10)
        
        def adjust_zoom(d):
            self.sim_zoom = max(0.1, self.sim_zoom + d)
            render_view()

        tk.Button(z_ctrl, text="-", command=lambda: adjust_zoom(-0.1), width=4).pack(side=tk.LEFT, padx=2, pady=2)
        tk.Button(z_ctrl, text="+", command=lambda: adjust_zoom(0.1), width=4).pack(side=tk.LEFT, padx=2, pady=2)

        # --- 3. ส่วนกลาง: Canvas (ให้เหลือพื้นที่ที่เหลือ) ---
        self.sim_canvas = tk.Canvas(self.sim_win, bg="black", highlightthickness=0)
        self.sim_canvas.pack(fill=tk.BOTH, expand=True)

        def render_view():
            sw, sh = self.sim_full_img.size
            new_s = (int(sw * self.sim_zoom), int(sh * self.sim_zoom))
            resized = self.sim_full_img.resize(new_s, Image.Resampling.LANCZOS)
            self.tk_sim_img = ImageTk.PhotoImage(resized)
            self.sim_canvas.delete("all")
            self.sim_canvas.create_image(0, 0, image=self.tk_sim_img, anchor=tk.NW)
            self.sim_canvas.config(scrollregion=(0, 0, new_s[0], new_s[1]))

        # ลากรูปได้เหมือนเดิม
        self.sim_canvas.bind("<Button-1>", lambda e: self.sim_canvas.scan_mark(e.x, e.y))
        self.sim_canvas.bind("<B1-Motion>", lambda e: self.sim_canvas.scan_dragto(e.x, e.y, gain=1))

        render_view()

    def confirm_and_save_json(self):
        """บันทึกพิกัดลายเซ็นที่จัดวางแล้วลงไฟล์ JSON"""
        if not self.paths: return

        area = self.current_doc['signatureArea']
        pad_w, pad_h = self.right_canvas.winfo_width(), self.right_canvas.winfo_height()

        # คำนวณ Scale และตำแหน่ง (รักษาสัดส่วน)
        all_pts = [pt for path in self.paths for pt in path]
        min_px, max_px = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
        min_py, max_py = min(p[1] for p in all_pts), max(p[1] for p in all_pts)
        sig_w, sig_h = max_px - min_px, max_py - min_py
        
        scale = min(area['width']/sig_w, area['height']/sig_h) * 0.8
        target_cx, target_cy = area['x'] + (area['width']/2), area['y'] + (area['height']/2)
        sig_cx, sig_cy = (min_px + max_px)/2, (min_py + max_py)/2

        # เตรียมข้อมูล JSON
        signature_data = {
            "metadata": {
                "docId": self.current_doc['docId'],
                "student": self.current_doc['studentName']
            },
            "points_px": [] # พิกัดบนรูปภาพ (Pixels)
        }

        for path in self.paths:
            current_path = []
            for px, py in path:
                # คำนวณจุดลงบนกระดาษจริง (Pixel Unit)
                mx = target_cx + (px - sig_cx) * scale
                my = target_cy + (py - sig_cy) * scale
                current_path.append({"x": round(mx, 2), "y": round(my, 2)})
            signature_data["points_px"].append(current_path)

        # เซฟไฟล์
        with open("signature_task.json", "w", encoding="utf-8") as f:
            json.dump(signature_data, f, indent=4, ensure_ascii=False)

        messagebox.showinfo("สำเร็จ", "บันทึกพิกัดลง signature_task.json แล้ว!\nพร้อมสำหรับส่งไปเครื่อง CNC")
        self.sim_win.destroy()
if __name__ == "__main__":
    root = tk.Tk()
    app = ProProfessorApp(root)
    root.mainloop()