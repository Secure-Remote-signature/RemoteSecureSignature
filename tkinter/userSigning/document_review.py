import tkinter as tk
from tkinter import messagebox
from io import BytesIO
import json
import ast

import requests
from PIL import Image, ImageTk, ImageOps

from app_config import API_BASE_URL, build_api_url, build_auth_headers
from userSigning.reject_reason import prompt_reject_reason


class DocumentReviewPage(tk.Frame):
    A4_WIDTH_MM = 210
    A4_HEIGHT_MM = 290
    A4_DPI = 300

    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.backend_url = API_BASE_URL
        self.current_request = None
        self.orig_img = None
        self.zoom_level = 1.0
        self.base_fit_zoom = 1.0
        self.signature_area = None

        self.setup_ui()

    def get_a4_px_size(self):
        width_px = round(self.A4_WIDTH_MM * self.A4_DPI / 25.4)
        height_px = round(self.A4_HEIGHT_MM * self.A4_DPI / 25.4)
        return width_px, height_px

    def normalize_image_to_a4(self, source_img):
        a4_w, a4_h = self.get_a4_px_size()
        img = ImageOps.exif_transpose(source_img).convert("RGB")
        src_w, src_h = img.size

        resized = img.resize((a4_w, a4_h), Image.Resampling.LANCZOS)
        scale_x = a4_w / max(1, src_w)
        scale_y = a4_h / max(1, src_h)

        transform = {
            "scale_x": scale_x,
            "scale_y": scale_y,
            "a4_width": a4_w,
            "a4_height": a4_h,
        }
        return resized, transform

    def map_signature_area_to_normalized_doc(self, signature_area, transform):
        if not signature_area:
            return None

        try:
            x = float(signature_area.get("x", 0))
            y = float(signature_area.get("y", 0))
            width = float(signature_area.get("width", 0))
            height = float(signature_area.get("height", 0))
        except (TypeError, ValueError, AttributeError):
            return None

        if width <= 0 or height <= 0:
            return None

        scale_x = transform["scale_x"]
        scale_y = transform["scale_y"]
        mapped = {
            "x": max(0, int(round(x * scale_x))),
            "y": max(0, int(round(y * scale_y))),
            "width": max(1, int(round(width * scale_x))),
            "height": max(1, int(round(height * scale_y))),
        }

        max_w = transform["a4_width"]
        max_h = transform["a4_height"]
        mapped["x"] = min(mapped["x"], max_w - 1)
        mapped["y"] = min(mapped["y"], max_h - 1)
        mapped["width"] = min(mapped["width"], max_w - mapped["x"])
        mapped["height"] = min(mapped["height"], max_h - mapped["y"])
        return mapped

    def parse_signature_area(self, raw_area):
        if isinstance(raw_area, dict):
            return raw_area
        if not isinstance(raw_area, str):
            return None

        text = raw_area.strip()
        if not text:
            return None

        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        try:
            parsed = ast.literal_eval(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        return None

    def setup_ui(self):
        toolbar = tk.Frame(self, bg="#FFFFFF", height=60, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        toolbar.pack(side="top", fill="x")

        tk.Button(
            toolbar,
            text="← BACK",
            font=("Arial", 10, "bold"),
            bg="#64748B",
            fg="#FFFFFF",
            relief="flat",
            padx=15,
            command=lambda: self.controller.show_frame("DashboardPage"),
        ).pack(side="left", padx=15, pady=10)

        zoom_frame = tk.Frame(toolbar, bg="#FFFFFF")
        zoom_frame.pack(side="left", padx=20)
        tk.Button(zoom_frame, text="-", command=lambda: self.adjust_zoom(-0.1), width=3).pack(side="left")
        self.zoom_lbl = tk.Label(zoom_frame, text="100%", bg="#FFFFFF", fg="#1E293B", width=6)
        self.zoom_lbl.pack(side="left")
        tk.Button(zoom_frame, text="+", command=lambda: self.adjust_zoom(0.1), width=3).pack(side="left")

        action_frame = tk.Frame(toolbar, bg="#FFFFFF")
        action_frame.pack(side="right", padx=15)

        tk.Button(
            action_frame,
            text="ปฏิเสธการลงนาม",
            font=("Arial", 10, "bold"),
            bg="#E11D48",
            fg="#FFFFFF",
            relief="flat",
            padx=18,
            command=self.reject_request,
        ).pack(side="right", padx=(8, 0), pady=10)

        tk.Button(
            action_frame,
            text="ลงนามเอกสาร",
            font=("Arial", 10, "bold"),
            bg="#10B981",
            fg="#FFFFFF",
            relief="flat",
            padx=18,
            command=self.go_to_signature,
        ).pack(side="right", pady=10)

        self.canvas = tk.Canvas(self, bg="#000000", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        self.canvas.bind("<Button-1>", lambda e: self.canvas.scan_mark(e.x, e.y))
        self.canvas.bind("<B1-Motion>", lambda e: self.canvas.scan_dragto(e.x, e.y, gain=1))
        self.canvas.bind("<Configure>", self.on_canvas_resize)

    def set_request_data(self, data):
        self.current_request = data or {}
        self.zoom_level = 1.0
        self.signature_area = None
        self.load_document()

    def load_document(self):
        if not self.current_request:
            self.show_placeholder("ไม่พบข้อมูลงานเอกสาร")
            return

        filename = self.current_request.get("requestPicture") or self.current_request.get("docFileName")
        if not filename:
            self.show_placeholder("ไม่พบชื่อไฟล์เอกสาร")
            return

        img_url = f"{self.backend_url}/uploads/{filename}"
        try:
            response = requests.get(img_url, timeout=10)
            if response.status_code != 200:
                self.show_placeholder(f"โหลดเอกสารไม่สำเร็จ (HTTP {response.status_code})")
                return

            raw_img = Image.open(BytesIO(response.content))
            normalized_img, transform = self.normalize_image_to_a4(raw_img)
            self.orig_img = normalized_img
            a4_w, a4_h = self.get_a4_px_size()
            if isinstance(self.current_request, dict):
                self.current_request["paper_width"] = float(a4_w)
                self.current_request["paper_height"] = float(a4_h)

            raw_area = self.parse_signature_area(self.current_request.get("signatureArea"))
            self.signature_area = self.map_signature_area_to_normalized_doc(raw_area, transform)

            self.update_base_fit_zoom()
            self.render_canvas()
        except Exception as exc:
            self.show_placeholder(f"โหลดเอกสารไม่สำเร็จ: {exc}")

    def show_placeholder(self, text):
        self.canvas.delete("all")
        self.canvas.create_text(
            300,
            220,
            text=text,
            font=("Arial", 13, "bold"),
            fill="#E2E8F0",
        )

    def on_canvas_resize(self, _event):
        if self.orig_img:
            self.update_base_fit_zoom()
            self.render_canvas()

    def update_base_fit_zoom(self):
        if not self.orig_img:
            self.base_fit_zoom = 1.0
            return

        canvas_w = max(1, self.canvas.winfo_width())
        canvas_h = max(1, self.canvas.winfo_height())
        img_w, img_h = self.orig_img.size
        fit_zoom = min(canvas_w / max(1, img_w), canvas_h / max(1, img_h))
        self.base_fit_zoom = max(0.01, fit_zoom)

    def adjust_zoom(self, delta):
        if not self.orig_img:
            return
        self.zoom_level = max(0.1, self.zoom_level + delta)
        self.render_canvas()

    def render_canvas(self):
        if not self.orig_img:
            return

        effective_zoom = self.base_fit_zoom * self.zoom_level
        w, h = self.orig_img.size
        new_size = (max(1, int(w * effective_zoom)), max(1, int(h * effective_zoom)))
        resized = self.orig_img.resize(new_size, Image.Resampling.LANCZOS)

        self.tk_preview_img = ImageTk.PhotoImage(resized)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, image=self.tk_preview_img, anchor=tk.NW)

        if self.signature_area:
            x = float(self.signature_area.get("x", 0)) * effective_zoom
            y = float(self.signature_area.get("y", 0)) * effective_zoom
            sw = float(self.signature_area.get("width", 0)) * effective_zoom
            sh = float(self.signature_area.get("height", 0)) * effective_zoom
            self.canvas.create_rectangle(x, y, x + sw, y + sh, outline="#EF4444", width=3, dash=(6, 4))
            self.canvas.create_text(x, y - 10, text="ตำแหน่งลายเซ็น", fill="#EF4444", anchor="sw")

        self.canvas.config(scrollregion=(0, 0, new_size[0], new_size[1]))
        self.zoom_lbl.config(text=f"{int(effective_zoom * 100)}%")

    def go_to_signature(self):
        if not self.current_request:
            messagebox.showwarning("Warning", "ไม่พบข้อมูลงานลงนาม")
            return
        self.controller.show_frame("SignaturePage", data=self.current_request)

    def reject_request(self):
        if not self.current_request:
            messagebox.showwarning("Warning", "ไม่พบข้อมูลงานลงนาม")
            return

        if not messagebox.askyesno("ยืนยัน", "คุณต้องการปฏิเสธคำร้องนี้ใช่หรือไม่?"):
            return

        reason = prompt_reject_reason(self.winfo_toplevel())
        if reason is None:
            return

        req_id = self.current_request.get("requestId")
        if not req_id:
            messagebox.showerror("Error", "ไม่พบ requestId")
            return

        try:
            res = requests.put(
                build_api_url(f"/srs/request/update-status/{req_id}"),
                json={"status": "Rejected", "rejectReason": reason},
                timeout=5,
                headers=build_auth_headers(self.controller),
            )
            if res.status_code == 200:
                messagebox.showinfo("สำเร็จ", "ปฏิเสธคำร้องแล้ว")
                self.controller.show_frame("DashboardPage")
            else:
                messagebox.showerror("Error", f"ปฏิเสธไม่สำเร็จ (HTTP {res.status_code})")
        except Exception as exc:
            messagebox.showerror("Error", f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {exc}")
