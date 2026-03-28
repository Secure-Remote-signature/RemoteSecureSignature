import tkinter as tk
from tkinter import messagebox
import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv
import time
from websocket import create_connection
from userSigning.reject_reason import prompt_reject_reason
from app_config import (
    build_api_url,
    build_auth_headers,
    CNC_WS_URL,
    CNC_WS_SEND_TIMEOUT_SEC,
    CNC_WS_ACK_TIMEOUT_SEC,
    CNC_WS_ACK_REQUIRED,
    CNC_WS_RETRY,
)

class ExecutionPage(tk.Frame):
    A4_WIDTH_MM = 210
    A4_HEIGHT_MM = 297
    A4_DPI = 300

    def __init__(self, parent, controller):
        super().__init__(parent, bg="#111827")
        self.controller = controller
        self.current_request = {} 
        self.sim_win = None
        self.signature_points = []
        self.paper_width = 0
        self.paper_height = 0
        self.sign_command_sent = False
        self.running_signing = False
        self._signing_progress_value = 0
        self._start_locked_for_request = False

        self.setup_ui()
        self.setup_canvas_events()
    load_dotenv()
    @classmethod
    def _a4_px_size(cls):
        width = round(cls.A4_WIDTH_MM * cls.A4_DPI / 25.4)
        height = round(cls.A4_HEIGHT_MM * cls.A4_DPI / 25.4)
        return float(width), float(height)

    def set_machine_status(self, status):
        status_lc = str(status or "").strip().lower()
        status_map = {
            "idle": ("● MACHINE IDLE", "#94A3B8"),
            "ready": ("● MACHINE READY", "#10B981"),
            "executing": ("● MACHINE EXECUTING", "#F59E0B"),
            "finished": ("● MACHINE FINISHED", "#10B981"),
            "halted": ("● MACHINE HALTED", "#EF4444"),
            "error": ("● MACHINE ERROR", "#EF4444"),
        }
        text, color = status_map.get(status_lc, ("● MACHINE UNKNOWN", "#94A3B8"))
        if hasattr(self, "status_lbl"):
            self.status_lbl.config(text=text, fg=color)

    def _lock_start_button_for_request(self):
        self._start_locked_for_request = True
        if hasattr(self, "start_btn"):
            self.start_btn.config(state="disabled", bg="#6B7280", activebackground="#6B7280", fg="#E5E7EB")

    def _unlock_start_button_for_new_request(self):
        self._start_locked_for_request = False
        if hasattr(self, "start_btn"):
            self.start_btn.config(state="normal", bg="#10B981", activebackground="#10B981", fg="white")

    def _extract_paper_size(self):
        return self._a4_px_size()

    def _to_positive_float(self, value, fallback):
        try:
            parsed = float(value)
            if parsed > 0:
                return parsed
        except (TypeError, ValueError):
            pass
        return float(fallback)

    # --- Modified Section: Convert coordinates to millimeters (mm) ---
    def _normalize_points_to_a4(self):
        # Set target directly to 210.0 and 297.0 (mm)
        target_w = float(self.A4_WIDTH_MM)
        target_h = float(self.A4_HEIGHT_MM)

        # source_w, source_h are the original dimensions of the uploaded image (usually in pixels)
        source_w = self._to_positive_float(self.paper_width, target_w)
        source_h = self._to_positive_float(self.paper_height, target_h)

        # Calculate the scaling ratio from original dimensions to fit the 210x297 mm frame
        scale_x = target_w / source_w
        scale_y = target_h / source_h

        if abs(scale_x - 1.0) < 1e-9 and abs(scale_y - 1.0) < 1e-9:
            return self.signature_points, source_w, source_h, target_w, target_h

        normalized_paths = []
        for path in self.signature_points:
            if not isinstance(path, list):
                continue

            normalized_path = []
            for pt in path:
                if not isinstance(pt, dict):
                    continue
                try:
                    x = float(pt.get("x", 0.0))
                    y = float(pt.get("y", 0.0))
                except (TypeError, ValueError):
                    continue

                # Multiply x, y coordinates by the scale and round to 2 decimal places (in mm)
                normalized_path.append({
                    "x": round(x * scale_x, 2),
                    "y": round(y * scale_y, 2),
                })

            if normalized_path:
                normalized_paths.append(normalized_path)

        return normalized_paths, source_w, source_h, target_w, target_h

    def _build_signature_task_payload(self, request_id):
        # Call the function that converts to mm
        normalized_points, source_w, source_h, width, height = self._normalize_points_to_a4()

        return {
            "requestId": request_id,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "width": width,   # Will be 210.0
            "height": height, # Will be 297.0
            "points_mm": normalized_points, # Changed from points_px to points_mm for clarity (if CNC supports it)
            "requestMeta": {
                "requestRTSP": self.current_request.get("requestRTSP"),
                "requestStatus": self.current_request.get("requestStatus"),
                "requestFile": self.current_request.get("requestFile"),
            },
        }
    # ----------------------------------------------------

    def _send_payload_to_cnc_ws(self, task_payload):

        if not CNC_WS_URL:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TK_CNC_WS_URL สำหรับเครื่อง CNC")

        payload_json = json.dumps(task_payload, ensure_ascii=False)

        last_error = None
        for attempt in range(1, CNC_WS_RETRY + 1):
            ws = None
            try:
                ws = create_connection(CNC_WS_URL, timeout=CNC_WS_SEND_TIMEOUT_SEC)
                ws.settimeout(CNC_WS_ACK_TIMEOUT_SEC)
                ws.send(payload_json)

                if CNC_WS_ACK_REQUIRED:
                    ack_raw = ws.recv()
                    ack = json.loads(ack_raw)
                    ack_type = str(ack.get("type", "")).lower()
                    ack_request_id = ack.get("requestId")
                    if ack_type != "ack":
                        raise RuntimeError(f"ACK ไม่ถูกต้อง: {ack_raw}")
                    if ack_request_id not in (None, task_payload.get("requestId")):
                        raise RuntimeError(f"ACK requestId ไม่ตรง: {ack_raw}")

                return
            except Exception as exc:
                last_error = exc
                if attempt < CNC_WS_RETRY:
                    time.sleep(0.5)
            finally:
                if ws is not None:
                    try:
                        ws.close()
                    except Exception:
                        pass

        raise RuntimeError(f"ส่ง payload ไป CNC ผ่าน WebSocket ไม่สำเร็จ: {last_error}")

    def _save_signature_task_file(self, request_id, task_payload):
        base_dir = os.path.dirname(__file__)
        output_dir = os.path.join(base_dir, "signature_tasks")
        os.makedirs(output_dir, exist_ok=True)

        output_path = os.path.join(output_dir, f"signatureTask_{request_id}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(task_payload, f, ensure_ascii=False, indent=2)

        return output_path

    def _update_request_status(self, request_id, status):
        try:
            res = requests.put(
                build_api_url(f"/srs/request/update-status/{request_id}"),
                json={"status": status},
                timeout=5,
                headers=build_auth_headers(self.controller),
            )
        except Exception as exc:
            raise RuntimeError(f"อัปเดตสถานะเป็น {status} ไม่สำเร็จ: {exc}")

        if res.status_code not in (200, 409):
            raise RuntimeError(f"อัปเดตสถานะเป็น {status} ไม่สำเร็จ (HTTP {res.status_code})")

    def setup_ui(self):
        # --- 1. Top Status Bar ---
        top_bar = tk.Frame(self, bg="#1E293B", height=60)
        top_bar.pack(side="top", fill="x")
        top_bar.pack_propagate(False)
        
        self.status_lbl = tk.Label(top_bar, text="● MACHINE READY", font=("Arial", 14, "bold"), 
        bg="#1E293B", fg="#10B981")
        self.status_lbl.pack(side="left", padx=20, pady=15)

        tk.Button(top_bar, text="← กลับหน้าหลัก", bg="#334155", fg="white", relief="flat",
            command=lambda: self.controller.show_frame("DashboardPage")).pack(side="right", padx=16)

        # --- 2. Main Layout ---
        main_container = tk.Frame(self, bg="#111827")
        main_container.pack(fill="both", expand=True, padx=12, pady=(6, 6))

        # --- CNC Live Monitoring Camera ---
        sig_frame = tk.LabelFrame(main_container, text=" กล้องเฝ้าหน้างาน CNC ", bg="#111827", fg="white")
        sig_frame.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        self.camera_view = tk.Canvas(sig_frame, bg="#000000", width=400, height=300)
        self.camera_view.pack(fill="both", expand=True, pady=10, padx=10)
        self.show_camera_placeholder("รอเริ่มงานลงนาม")

        tk.Button(sig_frame, text="REFRESH VIEW", bg="#64748B", fg="white", font=("Arial", 10),
            command=self.refresh_camera_view).pack(fill="x", padx=10, pady=(0, 6))

        # --- 3. Bottom Control Buttons ---
        btn_frame = tk.Frame(main_container, bg="#111827")
        btn_frame.pack(fill="x", pady=(0, 6))

        self.start_btn = tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 10, "bold"),
            padx=12, pady=8, command=self.start_signing)
        self.start_btn.pack(side="left", padx=6, fill="x", expand=True)
        
        tk.Button(btn_frame, text="CANCEL", bg="#EF4444", fg="white", font=("Arial", 10, "bold"), padx=12, pady=8,
            command=self.cancel_action).pack(side="left", padx=6, fill="x", expand=True)

        self.set_machine_status("ready")
        self._unlock_start_button_for_new_request()

    # --- Camera System (Execution Monitor) ---
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
            self.paper_width = data.get("paper_width") or 0
            self.paper_height = data.get("paper_height") or 0
        else:
            self.current_request = data or {}
            self.signature_points = (data or {}).get("points_px") or []
            self.paper_width = (data or {}).get("paper_width") or 0
            self.paper_height = (data or {}).get("paper_height") or 0

        # Default values here use pixel size to keep the original source dimensions
        default_w, default_h = self._a4_px_size()
        self.paper_width = self._to_positive_float(self.paper_width, default_w)
        self.paper_height = self._to_positive_float(self.paper_height, default_h)

        self.sign_command_sent = False
        self.running_signing = False
        self._signing_progress_value = 0
        self._unlock_start_button_for_new_request()
        print(f"Execution Page: ได้รับ data request - {self.current_request}")
        self.refresh_camera_view()
        if self.current_request:
            self.set_machine_status("ready")
        else:
            self.set_machine_status("idle")
  
    def cleanup_modals(self):
        if self.sim_win:
            try:
                self.sim_win.destroy()
                self.sim_win = None
            except:
                pass

    def start_signing(self):
        if self._start_locked_for_request:
            return

        if self.running_signing:
            return

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

            request_id = self.current_request.get('requestId')
            if not request_id:
                messagebox.showwarning("Warning", "ไม่พบ requestId ของคำร้อง จึงไม่สามารถเริ่ม CNC ได้", parent=self.winfo_toplevel())
                return

            if not self.signature_points:
                messagebox.showwarning("Warning", "ไม่พบพิกัดลายเซ็น กรุณากลับไปยืนยันจากหน้า Preview", parent=self.winfo_toplevel())
                return

            try:
                task_payload = self._build_signature_task_payload(request_id)
                file_path = self._save_signature_task_file(request_id, task_payload)
                self._send_payload_to_cnc_ws(task_payload)
                print(f"Execution Page: บันทึกไฟล์งานแล้วที่ {file_path}")
                print(f"Execution Page: ส่ง payload ไป CNC ผ่าน WebSocket แล้ว (requestId={request_id})")
            except Exception as e:
                messagebox.showerror("Error", f"ส่ง payload ไป CNC ไม่สำเร็จ: {e}", parent=self.winfo_toplevel())
                return

            if not self.sign_command_sent:
                try:
                    self._update_request_status(request_id, "Signing")
                except Exception as e:
                    messagebox.showerror("Error", str(e), parent=self.winfo_toplevel())
                    return

                self.sign_command_sent = True
                self._lock_start_button_for_request()

            self.set_machine_status("executing")
            self._signing_progress_value = 0
            self.run_progress()
        finally:
            if self._signing_progress_value == 0 and not self.sign_command_sent:
                self.running_signing = False

    def run_progress(self):
        if self._signing_progress_value < 100:
            self._signing_progress_value += 5
            self.after(100, self.run_progress)
        else:
            self.set_machine_status("finished")
            request_id = self.current_request.get('requestId') if self.current_request else None
            if request_id:
                try:
                    self._update_request_status(request_id, "Signed")
                except Exception as exc:
                    messagebox.showwarning("Warning", str(exc), parent=self.winfo_toplevel())
            try:
                try:
                    self.cleanup_modals()
                except:
                    pass
                messagebox.showinfo("Success", "CNC Signing Completed!", parent=self.winfo_toplevel())
            finally:
                self.current_request = {}
                self.signature_points = []
                self.sign_command_sent = False
                self.running_signing = False
                self._signing_progress_value = 0
            
    def cancel_action(self):
        if not messagebox.askyesno("ยืนยัน", "ยกเลิกงานนี้และปฏิเสธคำร้องใช่หรือไม่?", parent=self.winfo_toplevel()):
            return

        reason = prompt_reject_reason(self.winfo_toplevel())
        if reason is None:
            return

        req_id = self.current_request.get('requestId') if self.current_request else None
        if req_id:
            try:
                requests.put(
                    build_api_url(f"/srs/request/update-status/{req_id}"),
                    json={"status": "Rejected", "rejectReason": reason},
                    timeout=5,
                    headers=build_auth_headers(self.controller),
                )
            except Exception:
                messagebox.showerror("Error", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", parent=self.winfo_toplevel())
                return

        self.set_machine_status("halted")
        self.show_camera_placeholder("หยุดฉุกเฉินแล้ว - โปรดตรวจสอบเครื่อง CNC")
        self.running_signing = False
        self.sign_command_sent = False
        self._signing_progress_value = 0
        self.controller.show_frame("DashboardPage")