import tkinter as tk
from tkinter import messagebox
import requests
import json
from datetime import datetime
import time
from websocket import create_connection
from userSigning.reject_reason import prompt_reject_reason
from app_config import (
    build_api_url,
    CNC_WS_URL,
    CNC_WS_SEND_TIMEOUT_SEC,
    CNC_WS_ACK_TIMEOUT_SEC,
    CNC_WS_ACK_REQUIRED,
    CNC_WS_RETRY,
)

class ExecutionPage(tk.Frame):
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
        width = self.paper_width
        height = self.paper_height

        if not width or not height:
            width = self.current_request.get("paper_width") if self.current_request else 0
            height = self.current_request.get("paper_height") if self.current_request else 0

        try:
            width = float(width)
        except Exception:
            width = 0
        try:
            height = float(height)
        except Exception:
            height = 0

        return width, height

    def _build_signature_task_payload(self, request_id):
        width, height = self._extract_paper_size()

        return {
            "requestId": request_id,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "width": width,
            "height": height,
            "points_px": self.signature_points,
            "requestMeta": {
                "requestRTSP": self.current_request.get("requestRTSP"),
                "requestStatus": self.current_request.get("requestStatus"),
                "requestFile": self.current_request.get("requestFile"),
            },
        }

    def _send_payload_to_cnc_ws(self, task_payload):

        if not CNC_WS_URL:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TK_CNC_WS_URL สำหรับเครื่อง CNC")

        # envelope = {
        #     "type": "signature_task",
        #     "sentAt": datetime.utcnow().isoformat() + "Z",
        #     "data": task_payload,
        # }
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

    def _update_request_status(self, request_id, status):
        try:
            res = requests.put(
                build_api_url(f"/srs/request/update-status/{request_id}"),
                json={"status": status},
                timeout=5
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

        # --- กล้องเฝ้าหน้างาน CNC ---
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
                self._send_payload_to_cnc_ws(task_payload)
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