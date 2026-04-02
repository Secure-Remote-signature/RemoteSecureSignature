import tkinter as tk
from tkinter import messagebox
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import os
import requests
from app_config import build_api_url, build_auth_headers
import json
from io import BytesIO
from PIL import Image, ImageTk, ImageDraw, ImageOps

class HistoryPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        tz_name = os.getenv("TK_TIMEZONE", "Asia/Bangkok")
        try:
            self.display_tz = ZoneInfo(tz_name)
        except Exception:
            self.display_tz = ZoneInfo("Asia/Bangkok")
        
        # --- Top Navigation Bar ---
        top_bar = tk.Frame(self, bg="#FFFFFF", height=80, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        top_bar.pack(side="top", fill="x")
        
        tk.Label(top_bar, text="Signing Logs", font=("Arial", 22, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(side="left", padx=30, pady=20)
        
        tk.Button(top_bar, text="BACK", font=("Arial", 12, "bold"), 
                  bg="#64748B", fg="#FFFFFF", relief="flat", padx=30,
                  command=lambda: controller.show_frame("DashboardPage")).pack(side="right", padx=30)

        # --- List Header ---
        header_frame = tk.Frame(self, bg="#F1F5F9")
        header_frame.pack(fill="x", padx=20, pady=(20, 0))
        
        self.columns = [
            ("รหัส", 0.08), 
            ("ชื่อเอกสาร", 0.35), 
            ("ผู้ส่ง", 0.18), 
            ("วัน-เวลา", 0.18), 
            ("สถานะ", 0.12),
            ("ดู", 0.09) 
        ]
        
        for text, width in self.columns:
            lbl = tk.Label(header_frame, text=text, font=("Arial", 12, "bold"), 
                           bg="#F1F5F9", fg="#475569", anchor="w")
            lbl.place(relx=sum(h[1] for h in self.columns[:self.columns.index((text, width))]), relwidth=width)
        header_frame.config(height=45) # Taller header

        # --- Scrollable List Area ---
        container = tk.Frame(self, bg="#F9FAFB")
        container.pack(fill="both", expand=True, padx=20, pady=10)

        self.canvas = tk.Canvas(container, bg="#F9FAFB", highlightthickness=0)
        scrollbar = tk.Scrollbar(container, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = tk.Frame(self.canvas, bg="#F9FAFB")

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )

        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw", width=960)
        self.canvas.configure(yscrollcommand=scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self.load_history_from_backend()

    def _format_date(self, iso_text):
        if not iso_text:
            return "-"
        try:
            dt = datetime.fromisoformat(str(iso_text).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt = dt.astimezone(self.display_tz)
            return dt.strftime("%d/%m/%y %H:%M")
        except Exception:
            return str(iso_text)

    def _status_to_ui(self, status):
        status_lc = str(status or "").strip().lower()
        if status_lc == "signed":
            return "success"
        if status_lc == "rejected":
            return "failed"
        return "processing"

    def load_history_from_backend(self):
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()

        prof_id = getattr(self.controller, "current_user_id", None)
        if not prof_id:
            empty_lbl = tk.Label(self.scrollable_frame, text="ไม่พบข้อมูลผู้ใช้", bg="#F9FAFB", fg="#64748B", font=("Arial", 12))
            empty_lbl.pack(pady=30)
            return

        try:
            url = build_api_url(f"/srs/request/history/{prof_id}?limit=100")
            response = requests.get(url, timeout=5, headers=build_auth_headers(self.controller))
            if response.status_code != 200:
                raise Exception(f"HTTP {response.status_code}")

            rows = response.json() or []
        except Exception as e:
            messagebox.showerror("Error", f"โหลดประวัติไม่สำเร็จ: {e}")
            rows = []

        if not rows:
            empty_lbl = tk.Label(self.scrollable_frame, text="ยังไม่มีประวัติการลงนาม", bg="#F9FAFB", fg="#64748B", font=("Arial", 12))
            empty_lbl.pack(pady=30)
            return

        for row in rows:
            sender_name = (row.get("studentName") or "-").strip()
            sender_last = (row.get("studentLastName") or "").strip()
            sender = f"{sender_name} {sender_last}".strip()
            log = {
                "id": f"REQ-{row.get('requestId')}",
                "docName": row.get("requestSubject") or row.get("requestMessage") or row.get("requestNumber") or "-",
                "sender": sender or "-",
                "date": self._format_date(row.get("requestDate")),
                "status": self._status_to_ui(row.get("requestStatus")),
                "rawStatus": row.get("requestStatus") or "-",
                "requestPicture": row.get("requestPicture"),
                "signatureCoordinates": row.get("signatureCoordinates"),
                "requestNumber": row.get("requestNumber") or "-",
                "requestRTSP": row.get("requestRTSP") or "-",
                "createdAt": self._format_date(row.get("createdAt")),
                "claimedAt": self._format_date(row.get("claimedAt")),
                "startedAt": self._format_date(row.get("startedAt")),
                "completedAt": self._format_date(row.get("completedAt")),
                "stateVersion": row.get("stateVersion") if row.get("stateVersion") is not None else "-",
                "ownerName": f"{(row.get('ownerName') or '').strip()} {(row.get('ownerLastName') or '').strip()}".strip() or "-",
                "rejectReason": (row.get("rejectReason") or "").strip(),
            }

            item_frame = tk.Frame(self.scrollable_frame, bg="#FFFFFF", bd=0, 
                                  highlightthickness=1, highlightbackground="#E2E8F0")
            item_frame.pack(fill="x", pady=6, padx=15, ipady=15) 

            tk.Label(item_frame, text=log['id'], font=("Arial", 12), bg="#FFFFFF", fg="#94A3B8").place(relx=0.02, relwidth=0.08, rely=0.5, anchor="w")
            
            tk.Label(item_frame, text=log['docName'], font=("Arial", 12, "bold"), bg="#FFFFFF", fg="#1E293B", anchor="w").place(relx=0.12, relwidth=0.33, rely=0.5, anchor="w")
            
            tk.Label(item_frame, text=log['sender'], font=("Arial", 12), bg="#FFFFFF", fg="#475569", anchor="w").place(relx=0.46, relwidth=0.15, rely=0.5, anchor="w")
            
            tk.Label(item_frame, text=log['date'], font=("Arial", 12), bg="#FFFFFF", fg="#64748B", anchor="w").place(relx=0.62, relwidth=0.16, rely=0.5, anchor="w")
            
            status_style = self.get_status_style(log['status'])
            status_text = "สำเร็จ" if log['status'] == 'success' else "ล้มเหลว" if log['status'] == 'failed' else "กำลังทำ"
            
            status_lbl = tk.Label(item_frame, text=status_text, font=("Arial", 10, "bold"), 
                                  bg=status_style['bg'], fg=status_style['fg'], 
                                  padx=10, pady=4, bd=0)
            status_lbl.place(relx=0.80, relwidth=0.10, rely=0.5, anchor="w")


            view_btn = tk.Button(item_frame, text="ดูรายละเอียด", font=("Arial", 10, "bold"), 
                                 bg="#F1F5F9", fg="#4F46E5", activebackground="#E2E8F0",
                                 relief="flat", bd=0, cursor="hand2", padx=10,
                                 command=lambda l=log: self.view_log_detail(l))
            view_btn.place(relx=0.91, relwidth=0.07, rely=0.5, anchor="w")

    def get_status_style(self, status):
        if status == 'success': return {'bg': '#DCFCE7', 'fg': '#166534'}
        elif status == 'failed': return {'bg': '#FEE2E2', 'fg': '#991B1B'}
        else: return {'bg': '#FEF3C7', 'fg': '#92400E'}

    def view_log_detail(self, log):
        picture_name = log.get("requestPicture")
        if not picture_name:
            messagebox.showwarning("Warning", "ไม่พบไฟล์เอกสารของรายการนี้")
            return

        try:
            image_url = build_api_url(f"/uploads/{picture_name}")
            image_res = requests.get(image_url, timeout=10)
            if image_res.status_code != 200:
                raise Exception(f"โหลดรูปไม่สำเร็จ (HTTP {image_res.status_code})")

            # Keep orientation consistent with signing flow by honoring EXIF orientation first.
            image = ImageOps.exif_transpose(Image.open(BytesIO(image_res.content))).convert("RGB")
            rendered = self._draw_saved_signature(image, log.get("signatureCoordinates"))
            self._open_preview_window(log, rendered)
        except Exception as e:
            messagebox.showerror("Error", f"เปิดพรีวิวไม่สำเร็จ: {e}")

    def _collect_signature_paths(self, signature_raw):
        paths = []

        if isinstance(signature_raw, str) and signature_raw.strip():
            try:
                parsed = json.loads(signature_raw)
                if isinstance(parsed, list):
                    paths = parsed
            except Exception:
                paths = []
        elif isinstance(signature_raw, list):
            paths = signature_raw

        normalized_paths = []
        all_points = []
        for path in paths:
            if not isinstance(path, list) or len(path) < 2:
                continue

            points = []
            for pt in path:
                if not isinstance(pt, dict):
                    continue
                x = pt.get("x")
                y = pt.get("y")
                if x is None or y is None:
                    continue
                point = (float(x), float(y))
                points.append(point)
                all_points.append(point)

            if len(points) >= 2:
                normalized_paths.append(points)

        bbox = None
        if all_points:
            xs = [p[0] for p in all_points]
            ys = [p[1] for p in all_points]
            pad = 14
            bbox = (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)

        return normalized_paths, bbox

    def _draw_saved_signature(self, base_image, signature_raw):
        img = base_image.copy()
        paths, bbox = self._collect_signature_paths(signature_raw)

        if not paths:
            return img

        draw = ImageDraw.Draw(img)
        for path in paths:
            draw.line(path, fill="#1D4ED8", width=5)

        if bbox:
            draw.rectangle(bbox, outline="#EF4444", width=3)

        return img

    def _open_preview_window(self, log, image):
        win = tk.Toplevel(self)
        win.title(f"Preview {log.get('id', '')}")
        win.geometry("820x620")
        win.configure(bg="#111827")

        header = tk.Frame(win, bg="#0F172A", height=56)
        header.pack(fill="x")
        tk.Label(
            header,
            text=f"{log.get('docName', '-') } | สถานะ: {log.get('rawStatus', '-')}",
            bg="#0F172A",
            fg="#E2E8F0",
            font=("Arial", 11, "bold")
        ).pack(side="left", padx=12, pady=14)

        control = tk.Frame(win, bg="#111827", height=70)
        control.pack(fill="x")

        meta_text = (
            f"เลขเอกสาร: {log.get('requestNumber', '-')} | "
            f"ผู้ลงนาม: {log.get('ownerName', '-')} | "
            f"ผู้ส่ง: {log.get('sender', '-')}\n"
            f"สร้าง: {log.get('createdAt', '-')} | เริ่มเซ็น: {log.get('startedAt', '-')} | "
            f"เซ็นเสร็จ: {log.get('completedAt', '-')} | RTSP: {log.get('requestRTSP', '-') }"
        )
        if str(log.get("rawStatus", "")).strip().lower() == "rejected":
            meta_text += f"\nเหตุผลที่ปฏิเสธ: {log.get('rejectReason') or '-'}"
        tk.Label(control, text=meta_text, bg="#111827", fg="#CBD5E1", font=("Arial", 9), justify="left", anchor="w").pack(side="left", padx=(12, 6), pady=8)

        zoom_label = tk.Label(control, text="100%", bg="#111827", fg="#E2E8F0", font=("Arial", 10, "bold"))
        zoom_label.pack(side="right", padx=(6, 12), pady=8)

        canvas = tk.Canvas(win, bg="#111827", highlightthickness=0)
        canvas.pack(fill="both", expand=True, padx=10, pady=10)

        win.preview_source = image
        win.preview_zoom = 1.0

        def render_preview():
            zoom = max(0.05, min(4.0, win.preview_zoom))
            src = win.preview_source
            target_size = (max(1, int(src.width * zoom)), max(1, int(src.height * zoom)))
            resized = src.resize(target_size, Image.Resampling.LANCZOS)
            win.tk_preview_image = ImageTk.PhotoImage(resized)
            canvas.delete("all")
            canvas.create_image(0, 0, image=win.tk_preview_image, anchor="nw")
            canvas.config(scrollregion=(0, 0, target_size[0], target_size[1]))
            zoom_label.config(text=f"{int(zoom * 100)}%")

        def fit_to_canvas():
            src = win.preview_source
            canvas_w = max(1, canvas.winfo_width())
            canvas_h = max(1, canvas.winfo_height())
            fit_zoom = min(canvas_w / max(1, src.width), canvas_h / max(1, src.height))
            win.preview_zoom = max(0.05, min(4.0, fit_zoom))
            render_preview()

        tk.Button(control, text="-", width=3, bg="#334155", fg="white", relief="flat", command=lambda: change_zoom(-0.1)).pack(side="right", pady=8)
        tk.Button(control, text="+", width=3, bg="#334155", fg="white", relief="flat", command=lambda: change_zoom(0.1)).pack(side="right", padx=(0, 6), pady=8)
        tk.Button(control, text="FIT", width=5, bg="#475569", fg="white", relief="flat", command=fit_to_canvas).pack(side="right", padx=(0, 6), pady=8)

        def change_zoom(delta):
            win.preview_zoom = max(0.05, min(4.0, win.preview_zoom + delta))
            render_preview()

        canvas.bind("<Button-1>", lambda e: canvas.scan_mark(e.x, e.y))
        canvas.bind("<B1-Motion>", lambda e: canvas.scan_dragto(e.x, e.y, gain=1))
        win.update_idletasks()
        fit_to_canvas()