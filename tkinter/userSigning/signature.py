import tkinter as tk
from tkinter import messagebox
import requests
from PIL import Image, ImageTk, ImageDraw, ImageOps
from io import BytesIO
import json
from app_config import API_BASE_URL

class SignaturePage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
        self.current_doc = {
        "docId": "TEST-001",
        "studentName": "John Doe",
        "signatureArea": {"x": 100, "y": 100, "width": 200, "height": 80}
    }
        
        # --- Data State ---
        self.backend_url = API_BASE_URL
        self.current_doc = None
        self.current_request = None
        self.orig_img = None  
        self.paths = []       
        self.zoom_level = 1.0
        self.base_fit_zoom = 1.0
        self.signature_area = None

        self.setup_ui()

    def setup_ui(self):
        # --- Top Toolbar ---
        toolbar = tk.Frame(self, bg="#FFFFFF", height=60, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        toolbar.pack(side="top", fill="x")
        
        # Back Button
        tk.Button(toolbar, text="← BACK", font=("Arial", 10, "bold"), bg="#64748B", fg="#FFFFFF", 
            relief="flat", padx=15, command=lambda: self.controller.show_frame("DashboardPage")).pack(side="left", padx=15, pady=10)

        # Fetch Document Button
        tk.Button(toolbar, text="🔄 FETCH REQUEST", font=("Arial", 10, "bold"), bg="#4F46E5", fg="#FFFFFF", 
            relief="flat", padx=15, command=self.fetch_doc).pack(side="left", padx=5)

        # Zoom Controls
        zoom_frame = tk.Frame(toolbar, bg="#FFFFFF")
        zoom_frame.pack(side="left", padx=20)
        tk.Button(zoom_frame, text="-", command=lambda: self.adjust_zoom(-0.1), width=3).pack(side="left")
        self.zoom_lbl = tk.Label(zoom_frame, text="100%", bg="#FFFFFF", fg="#1E293B", width=6)
        self.zoom_lbl.pack(side="left")
        tk.Button(zoom_frame, text="+", command=lambda: self.adjust_zoom(0.1), width=3).pack(side="left")

        # Confirm/Simulate Button
        tk.Button(toolbar, text="PREVIEW + CONFIRM", font=("Arial", 10, "bold"), bg="#10B981", fg="#FFFFFF", 
            relief="flat", padx=20, command=self.show_simulation).pack(side="right", padx=15)

        # --- Main Split Screen (Using PanedWindow) ---
        self.paned_window = tk.PanedWindow(self, orient=tk.HORIZONTAL, bg="#E5E7EB", sashwidth=6)
        self.paned_window.pack(fill=tk.BOTH, expand=True)

        # LEFT: Document Viewer
        self.left_canvas = tk.Canvas(self.paned_window, bg="#000000", highlightthickness=0)
        self.paned_window.add(self.left_canvas, width=512)

        # RIGHT: Signature Pad
        self.right_frame = tk.Frame(self.paned_window, bg="#FFFFFF")
        tk.Label(self.right_frame, text="Sign inside the box", bg="#FFFFFF", font=("Arial", 12, "bold"), fg="#64748B").pack(pady=10)
        
        self.right_canvas = tk.Canvas(self.right_frame, bg="#F1F5F9", bd=1, relief="solid")
        self.right_canvas.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Clear Button on the right
        tk.Button(self.right_frame, text="CLEAR SIGNATURE", font=("Arial", 9), bg="#EF4444", fg="#FFFFFF", 
            relief="flat", command=self.clear_sign).pack(pady=10)
        
        self.paned_window.add(self.right_frame, width=512)

        # --- Bindings ---
        self.right_canvas.bind("<Button-1>", self.start_draw)
        self.right_canvas.bind("<B1-Motion>", self.draw)
        self.left_canvas.bind("<Button-1>", lambda e: self.left_canvas.scan_mark(e.x, e.y))
        self.left_canvas.bind("<B1-Motion>", lambda e: self.left_canvas.scan_dragto(e.x, e.y, gain=1))
        self.left_canvas.bind("<Configure>", self.on_left_canvas_resize)

    def update_base_fit_zoom(self):
        if not self.orig_img:
            self.base_fit_zoom = 1.0
            return

        canvas_w = max(1, self.left_canvas.winfo_width())
        canvas_h = max(1, self.left_canvas.winfo_height())
        img_w, img_h = self.orig_img.size
        fit_zoom = min(canvas_w / max(1, img_w), canvas_h / max(1, img_h))
        self.base_fit_zoom = max(0.01, fit_zoom)

    def on_left_canvas_resize(self, _event):
        if self.orig_img:
            self.update_base_fit_zoom()
            self.render_left_canvas()

    # --- Logic Methods (Refactored from your original code) ---
    def fetch_doc(self):
        if self.current_request:
            self.load_doc_from_request(self.current_request)
            return

        if not getattr(self.controller, "current_user_id", None):
            messagebox.showwarning("Warning", "ไม่พบข้อมูลผู้ใช้")
            return

        try:
            url = f"{self.backend_url}/srs/request/pending/{self.controller.current_user_id}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200 and response.json():
                self.current_request = response.json()
                self.load_doc_from_request(self.current_request)
            else:
                messagebox.showinfo("API", "ยังไม่มีคำร้องใหม่")
        except Exception as e:
            messagebox.showerror("Error", f"เชื่อมต่อ backend ไม่สำเร็จ: {e}")

    def set_request_data(self, data):
        # Always reset previous drawing/doc state when a new request arrives.
        self.clear_sign()
        self.current_request = data
        self.signature_area = None
        self.zoom_level = 1.0
        self.orig_img = None
        self.left_canvas.delete("all")
        self.load_doc_from_request(data)

    def load_doc_from_request(self, data):
        filename = data.get("requestPicture") or data.get("docFileName")
        if not filename:
            messagebox.showwarning("Warning", "ไม่พบชื่อไฟล์เอกสาร")
            return

        img_url = f"{self.backend_url}/uploads/{filename}"
        try:
            response = requests.get(img_url, timeout=10)
            if response.status_code != 200:
                messagebox.showerror("Error", f"โหลดเอกสารไม่สำเร็จ (HTTP {response.status_code})")
                return

            raw_img = Image.open(BytesIO(response.content))
            self.orig_img = ImageOps.exif_transpose(raw_img)

            # signatureArea อาจมาเป็น object หรือ JSON string จาก DB
            raw_area = data.get("signatureArea")
            if isinstance(raw_area, str):
                try:
                    raw_area = json.loads(raw_area)
                except json.JSONDecodeError:
                    raw_area = None

            self.signature_area = raw_area or {"x": 200, "y": 1200, "width": 400, "height": 200}
            self.zoom_level = 1.0
            self.update_base_fit_zoom()
            self.render_left_canvas()
        except Exception as e:
            messagebox.showerror("Error", f"โหลดเอกสารไม่สำเร็จ: {e}")

    def render_left_canvas(self):
        if not self.orig_img: return
        w, h = self.orig_img.size
        effective_zoom = self.base_fit_zoom * self.zoom_level
        new_size = (max(1, int(w * effective_zoom)), max(1, int(h * effective_zoom)))
        resized = self.orig_img.resize(new_size, Image.Resampling.LANCZOS)
        self.tk_left_img = ImageTk.PhotoImage(resized)
        
        self.left_canvas.delete("all")
        self.left_canvas.create_image(0, 0, image=self.tk_left_img, anchor=tk.NW)
        self.left_canvas.config(scrollregion=(0, 0, new_size[0], new_size[1]))
        if self.signature_area:
            x = self.signature_area["x"] * effective_zoom
            y = self.signature_area["y"] * effective_zoom
            sw = self.signature_area["width"] * effective_zoom
            sh = self.signature_area["height"] * effective_zoom
            self.left_canvas.create_rectangle(x, y, x + sw, y + sh, outline="#EF4444", width=3, dash=(6, 4))
            self.left_canvas.create_text(x, y - 10, text="ตำแหน่งลายเซ็น", fill="#EF4444", anchor="sw")
        self.zoom_lbl.config(text=f"{int(effective_zoom * 100)}%")

    def adjust_zoom(self, delta):
        self.zoom_level = max(0.1, self.zoom_level + delta)
        self.render_left_canvas()

    def start_draw(self, event):
        self.paths.append([(event.x, event.y)])

    def draw(self, event):
        if self.paths:
            x1, y1 = self.paths[-1][-1]
            self.right_canvas.create_line(x1, y1, event.x, event.y, width=3, fill="#1E293B", capstyle=tk.ROUND, smooth=True)
            self.paths[-1].append((event.x, event.y))

    def clear_sign(self):
        self.right_canvas.delete("all")
        self.paths = []

    def show_simulation(self):
        if not self.current_request or not self.orig_img:
            messagebox.showwarning("Warning", "กรุณาโหลดเอกสารก่อน")
            return

        if not self.paths:
            messagebox.showwarning("Warning", "กรุณาเซ็นชื่อก่อน")
            return

        mapped_points = self.calculate_mapped_points()
        sim_img = self.orig_img.copy()
        draw = ImageDraw.Draw(sim_img)
        for path in mapped_points:
            mapped = [(pt["x"], pt["y"]) for pt in path]
            if len(mapped) > 1:
                draw.line(mapped, fill="blue", width=5)

        self.display_preview(sim_img, mapped_points)

    def calculate_mapped_points(self):
        area = self.signature_area or {"x": 200, "y": 1200, "width": 400, "height": 200}
        all_pts = [pt for path in self.paths for pt in path]
        min_x, max_x = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
        min_y, max_y = min(p[1] for p in all_pts), max(p[1] for p in all_pts)

        sig_w = max(max_x - min_x, 1)
        sig_h = max(max_y - min_y, 1)
        scale = min(area["width"] / sig_w, area["height"] / sig_h) * 0.8

        target_cx = area["x"] + (area["width"] / 2)
        target_cy = area["y"] + (area["height"] / 2)
        sig_cx = (min_x + max_x) / 2
        sig_cy = (min_y + max_y) / 2

        mapped_paths = []
        for path in self.paths:
            mapped_path = []
            for px, py in path:
                mx = target_cx + (px - sig_cx) * scale
                my = target_cy + (py - sig_cy) * scale
                mapped_path.append({"x": round(mx, 2), "y": round(my, 2)})
            if len(mapped_path) > 1:
                mapped_paths.append(mapped_path)
        return mapped_paths

    def display_preview(self, sim_img, mapped_points):
        sim_win = tk.Toplevel(self)
        sim_win.title("Preview ก่อนยืนยัน PIN")
        sim_win.geometry("700x500")

        canvas = tk.Canvas(sim_win, bg="#111827")
        canvas.pack(fill="both", expand=True)

        preview_copy = sim_img.copy()
        preview_copy.thumbnail((680, 420))
        self.tk_preview = ImageTk.PhotoImage(preview_copy)
        canvas.create_image(340, 210, image=self.tk_preview)

        button_row = tk.Frame(sim_win, bg="#111827")
        button_row.pack(fill="x", pady=10)
        tk.Button(button_row, text="ยกเลิก", bg="#475569", fg="white", padx=16,
                  command=sim_win.destroy).pack(side="left", padx=20)
        tk.Button(button_row, text="ยืนยันตำแหน่ง + ใส่ PIN", bg="#10B981", fg="white", padx=16,
                  command=lambda: self.confirm_preview(sim_win, mapped_points)).pack(side="right", padx=20)

    def confirm_preview(self, sim_win, mapped_points):
        sim_win.destroy()
        paper_width, paper_height = (0, 0)
        if self.orig_img:
            paper_width, paper_height = self.orig_img.size
        payload = {
            "request": self.current_request,
            "points_px": mapped_points,
            "paper_width": paper_width,
            "paper_height": paper_height
        }
        self.controller.show_frame("PinConfirmPage", data=payload)