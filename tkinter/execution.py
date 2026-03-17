import tkinter as tk
from tkinter import ttk, messagebox
import requests
from PIL import Image, ImageTk, ImageDraw
from io import BytesIO

class ExecutionPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#111827")
        self.controller = controller
        self.paths = []  
        self.current_path = []   
        self.orig_img = None
        self.current_request = {} 

        self.setup_ui()
        self.setup_canvas_events()
    def setup_ui(self):
        # --- 1. Top Status Bar ---
        top_bar = tk.Frame(self, bg="#1E293B", height=60)
        top_bar.pack(side="top", fill="x")
        
        self.status_lbl = tk.Label(top_bar, text="● SYSTEM READY...", font=("Arial", 14, "bold"), 
                                   bg="#1E293B", fg="#10B981")
        self.status_lbl.pack(side="left", padx=20, pady=15)

        # --- 2. Info Label ---
        self.info_label = tk.Label(self, text="รอรับข้อมูลเอกสาร...", font=("Arial", 12), bg="#111827", fg="white")
        self.info_label.pack(pady=10)

        # --- 3. Main Content: Canvas View ---
        self.camera_view = tk.Canvas(self, bg="#0F172A", highlightthickness=1, highlightbackground="#334155", width=900, height=450)
        self.camera_view.pack(fill="both", expand=True, padx=40, pady=10)
        self.show_placeholder()

        # --- 4. control buttons ---
        btn_frame = tk.Frame(self, bg="#111827")
        btn_frame.pack(pady=10)

        tk.Button(btn_frame, text="ล้างลายเซ็น", bg="#64748B", fg="white", font=("Arial", 11),
                  command=self.clear_canvas).pack(side="left", padx=10)

        tk.Button(btn_frame, text="PREVIEW SIMULATION", bg="#3B82F6", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.show_simulation).pack(side="left", padx=10)

        tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                  padx=20, pady=10, command=self.start_signing).pack(side="left", padx=10)
        
        tk.Button(btn_frame, text="CANCEL", bg="#EF4444", fg="white", font=("Arial", 12, "bold"), padx=20, pady=10,
                  command=lambda: self.controller.show_frame("DashboardPage")).pack(side="left", padx=10)

        # --- 5. Progress Area ---
        bottom_frame = tk.Frame(self, bg="#0F172A", height=100)
        bottom_frame.pack(side="bottom", fill="x", padx=40, pady=(0, 20))
        
        self.progress = ttk.Progressbar(bottom_frame, orient="horizontal", length=100, mode="determinate")
        self.progress.pack(side="left", fill="x", expand=True, padx=20)

        tk.Button(bottom_frame, text="EMERGENCY STOP", bg="#EF4444", fg="white", font=("Arial", 10, "bold"),
                  command=self.emergency_stop).pack(side="right", padx=10)

    def setup_canvas_events(self):
        self.camera_view.bind("<Button-1>", self.start_path)
        self.camera_view.bind("<B1-Motion>", self.draw_path)
        self.camera_view.bind("<ButtonRelease-1>", self.end_path)

    def show_placeholder(self):
        self.camera_view.delete("all")
        self.camera_view.create_text(450, 225, text="[ กรุณาเซ็นชื่อลงบนบริเวณนี้ ]", 
                                     font=("Arial", 20, "bold"), fill="#475569")

    def start_path(self, event):
        self.current_path = [(event.x, event.y)]
        
    def draw_path(self, event):
        if self.current_path:
            x1, y1 = self.current_path[-1]
            x2, y2 = event.x, event.y
            self.camera_view.create_line(x1, y1, x2, y2, fill="#60A5FA", width=3, tags="signature")
            self.current_path.append((x2, y2))

    def end_path(self, event):
        if len(self.current_path) > 1:
            self.paths.append(self.current_path)
        self.current_path = []

    def clear_canvas(self):
        self.paths = []
        self.camera_view.delete("signature")
        if self.orig_img: self.show_image_on_canvas(self.orig_img)
        else: self.show_placeholder()

    def set_request_data(self, data):
        self.current_request = data
        self.info_label.config(text=f"กำลังดำเนินการ: {data.get('studentName', 'Unknown')}\nID: {data.get('requestNumber', '-')}")
        if 'requestPicture' in data:
            self.load_original_document(data['requestPicture'])

    def load_original_document(self, filename):
        img_url = f"http://localhost:5000/uploads/{filename}"
        try:
            response = requests.get(img_url, timeout=10)
            if response.status_code == 200:
                self.orig_img = Image.open(BytesIO(response.content))
                self.show_image_on_canvas(self.orig_img)
                print(f"✅ Loaded: {filename}")
            else:
                self.info_label.config(text="❌ โหลดรูปไม่สำเร็จ")
        except Exception as e:
            print(f"⚠️ Error: {e}")

    def show_image_on_canvas(self, img):
        self.camera_view.delete("all")
        cw, ch = 900, 450
        img_copy = img.copy()
        img_copy.thumbnail((cw, ch), Image.Resampling.LANCZOS)
        self.tk_main_img = ImageTk.PhotoImage(img_copy)
        self.camera_view.create_image(cw//2, ch//2, image=self.tk_main_img, anchor=tk.CENTER)

    def show_simulation(self):
        if not self.orig_img or not self.paths:
            messagebox.showwarning("คำเตือน", "กรุณาเซ็นชื่อก่อนดู Preview")
            return
            
        sim_img = self.orig_img.copy()
        draw = ImageDraw.Draw(sim_img)
        
        area = {"x": 500, "y": 800, "width": 400, "height": 200} 
        
        all_pts = [pt for path in self.paths for pt in path]
        min_x, max_x = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
        min_y, max_y = min(p[1] for p in all_pts), max(p[1] for p in all_pts)
        
        sig_w, sig_h = max_x - min_x, max_y - min_y
        scale = min(area['width']/sig_w, area['height']/sig_h) * 0.8
        
        target_cx, target_cy = area['x'] + area['width']/2, area['y'] + area['height']/2
        sig_cx, sig_cy = (min_x + max_x)/2, (min_y + max_y)/2

        for path in self.paths:
            mapped = []
            for px, py in path:
                mx = target_cx + (px - sig_cx) * scale
                my = target_cy + (py - sig_cy) * scale
                mapped.append((mx, my))
            if len(mapped) > 1:
                draw.line(mapped, fill="blue", width=5)

        self.display_preview(sim_img)

    def display_preview(self, sim_img):
        self.sim_win = tk.Toplevel(self)
        self.sim_win.title("Preview")
        self.sim_win.geometry("800x600")
        
        canvas = tk.Canvas(self.sim_win, bg="#111827")
        canvas.pack(fill="both", expand=True)
        
        preview_copy = sim_img.copy()
        preview_copy.thumbnail((780, 500))
        self.tk_preview = ImageTk.PhotoImage(preview_copy)
        canvas.create_image(400, 250, image=self.tk_preview)

        tk.Button(self.sim_win, text="✅ ยืนยันพิกัดและส่งข้อมูล", bg="#10B981", fg="white",
                  command=self.confirm_and_send_api).pack(pady=10)

    def confirm_and_send_api(self):
        payload = {
            "requestId": self.current_request.get('requestId'),
            "points_px": self.paths # ส่งเส้นที่ลากไป
        }
        try:
            res = requests.post("http://localhost:5000/srs/request/confirm-signature", json=payload)
            if res.status_code == 200:
                messagebox.showinfo("สำเร็จ", "ลงนามเรียบร้อยแล้ว!")
                self.sim_win.destroy()
                self.controller.show_frame("DashboardPage")
        except:
            messagebox.showerror("Error", "ส่งข้อมูลไม่สำเร็จ")

    def start_signing(self):
        self.status_lbl.config(text="● EXECUTING...", fg="#F59E0B")
        self.progress['value'] = 0
        self.run_progress()

    def run_progress(self):
        if self.progress['value'] < 100:
            self.progress['value'] += 5
            self.after(100, self.run_progress)
        else:
            self.status_lbl.config(text="● FINISHED", fg="#10B981")
            messagebox.showinfo("Success", "CNC Signing Completed!")

    def emergency_stop(self):
        self.status_lbl.config(text="● HALTED", fg="#EF4444")
        messagebox.showwarning("Emergency", "CNC Machine Stopped!")