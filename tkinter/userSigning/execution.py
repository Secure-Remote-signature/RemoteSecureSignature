import tkinter as tk
from tkinter import messagebox
import requests
import json
import os
import sys
import vlc
import importlib
import queue
from datetime import datetime
from dotenv import load_dotenv
import time
from userSigning.reject_reason import prompt_reject_reason
from app_config import (
    build_api_url,
    build_auth_headers,
    CNC_MQTT_BROKER_HOST,
    CNC_MQTT_BROKER_PORT,
    CNC_MQTT_TOPIC_PAYLOAD,
    CNC_MQTT_TOPIC_STATUS,
    CNC_MQTT_TOPIC_EMRG,
    CNC_MQTT_USERNAME,
    CNC_MQTT_PASSWORD,
    CNC_MQTT_CLIENT_ID,
    CNC_MQTT_KEEPALIVE_SEC,
    CNC_MQTT_QOS,
    CNC_MQTT_STATUS_QOS,
    CNC_MQTT_RETRY,
    CNC_MQTT_PUBLISH_TIMEOUT_SEC,
    CNC_MQTT_WAIT_FOR_PUBLISH,
    CNC_COORD_OFFSET_X_MM,
    CNC_COORD_OFFSET_Y_MM,
    CNC_COORD_SCALE_X,
    CNC_COORD_SCALE_Y,
    CNC_COORD_FLIP_X,
    CNC_COORD_FLIP_Y,
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
        self._completion_handled = False
        self._seen_active_state_for_job = False
        self._start_locked_for_request = False

        self.camera_running = False
        self.vlc_instance = None
        self.vlc_player = None

        self._status_queue = queue.Queue()
        self._status_mqtt_client = None
        self._status_poll_after_id = None
        self._backend_status_after_id = None

        self.setup_ui()
        self.setup_canvas_events()
        self._start_mqtt_status_listener()
        self._start_backend_status_polling()
        self._schedule_status_queue_drain()
        self.after(1000, self.refresh_camera_view)
        self.after(1000, self.refresh_camera_view)

    load_dotenv()

    @classmethod
    def _a4_px_size(cls):
        width = round(cls.A4_WIDTH_MM * cls.A4_DPI / 25.4)
        height = round(cls.A4_HEIGHT_MM * cls.A4_DPI / 25.4)
        return float(width), float(height)

    @classmethod
    def _px_to_mm(cls, value_px):
        return float(value_px) * 25.4 / float(cls.A4_DPI)

    def set_machine_status(self, status):
        status_lc = str(status or "").strip().lower()
        status_map = {
            "idle": ("● MACHINE IDLE", "#10B981"),
            "ready": ("● MACHINE READY", "#10B981"),
            "homing": ("● MACHINE HOMING", "#F59E0B"),
            "drawing": ("● MACHINE EXECUTING", "#F59E0B"),
            "working": ("● MACHINE EXECUTING", "#F59E0B"),
            "executing": ("● MACHINE EXECUTING", "#F59E0B"),
            "finished": ("● MACHINE FINISHED", "#10B981"),
            "completed": ("● MACHINE FINISHED", "#10B981"),
            "emergency_stop": ("● MACHINE HALTED", "#EF4444"),
            "halted": ("● MACHINE HALTED", "#EF4444"),
            "error": ("● MACHINE ERROR", "#EF4444"),
            "offline": ("● MACHINE OFFLINE", "#EF4444"),
        }
        text, color = status_map.get(status_lc, ("● MACHINE UNKNOWN", "#94A3B8"))
        if hasattr(self, "status_lbl"):
            self.status_lbl.config(text=text, fg=color)

    def _normalize_machine_status(self, raw_status):
        value = str(raw_status or "").strip().lower()
        if value in {"busy", "working", "executing", "signing", "running", "printing", "drawing"}:
            return "drawing"
        if value in {"done", "complete", "completed", "finished"}:
            return "finished"
        if value in {"estop", "e_stop", "emergency", "stop", "emergency_stop"}:
            return "emergency_stop"
        return value

    def _reset_execution_state(self):
        self.current_request = {}
        self.signature_points = []
        self.sign_command_sent = False
        self.running_signing = False
        self._signing_progress_value = 0
        self._completion_handled = False
        self._seen_active_state_for_job = False
        self._stop_camera_stream(show_placeholder=True)

    def _complete_signing_if_needed(self):
        if self._completion_handled:
            return

        request_id = self.current_request.get("requestId") if self.current_request else None
        if not request_id:
            return

        self._completion_handled = True
        self.set_machine_status("finished")

        try:
            self._update_request_status(request_id, "Signed")
        except Exception as exc:
            messagebox.showwarning("Warning", str(exc), parent=self.winfo_toplevel())

        try:
            self.cleanup_modals()
        except Exception:
            pass

        if hasattr(self.controller, "end_signing_flow_lock"):
            self.controller.end_signing_flow_lock()

        messagebox.showinfo("Success", "CNC Signing Completed!", parent=self.winfo_toplevel())
        self._reset_execution_state()

    def _handle_machine_status_update(self, raw_status):
        status = self._normalize_machine_status(raw_status)
        if not status:
            return

        self.set_machine_status(status)

        if status in {"homing", "drawing"} and self.sign_command_sent:
            self._seen_active_state_for_job = True
            self.running_signing = True

        if status in {"finished"} and self.sign_command_sent and self._seen_active_state_for_job:
            self._complete_signing_if_needed()
            return

        if status in {"idle", "ready"} and self.sign_command_sent and self._seen_active_state_for_job:
            self._complete_signing_if_needed()
            return

        if status in {"idle", "ready"} and not self.sign_command_sent:
            self._unlock_start_button_for_new_request()

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

    def _normalize_points_to_a4(self):
        target_w, target_h = self._a4_px_size()
        a4_px_w, a4_px_h = self._a4_px_size()
        source_w = self._to_positive_float(self.paper_width, a4_px_w)
        source_h = self._to_positive_float(self.paper_height, a4_px_h)

        # if source_w < (a4_px_w * 0.6) or source_w > (a4_px_w * 1.4):
        #     source_w = a4_px_w
        # if source_h < (a4_px_h * 0.6) or source_h > (a4_px_h * 1.4):
        #     source_h = a4_px_h

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

                normalized_path.append({
                    "x": round(x * scale_x, 2),
                    "y": round(y * scale_y, 2),
                })

            if normalized_path:
                normalized_paths.append(normalized_path)

        return normalized_paths, source_w, source_h, target_w, target_h

    def _build_signature_task_payload(self, request_id):
        normalized_points, source_w, source_h, width_px, height_px = self._normalize_points_to_a4()
        width_mm = float(self.A4_WIDTH_MM)
        height_mm = float(self.A4_HEIGHT_MM)
        points_mm = []
        flat_points = []

        for path in normalized_points:
            mm_path = []
            for pt in path:
                raw_x_mm = round(self._px_to_mm(pt.get("x", 0.0)), 2)
                raw_y_mm = round(self._px_to_mm(pt.get("y", 0.0)), 2)
                calibrated_x_mm, calibrated_y_mm = self._calibrate_point_mm(raw_x_mm, raw_y_mm, width_mm, height_mm)
                mm_path.append({
                    "x": calibrated_x_mm,
                    "y": calibrated_y_mm,
                })
                flat_points.append((calibrated_x_mm, calibrated_y_mm))
            if mm_path:
                points_mm.append(mm_path)

        bbox_mm = self._compute_bbox_mm(flat_points)

        return {
            "requestId": request_id,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "width": width_mm,
            "height": height_mm,
            "points_mm": points_mm,
            "requestMeta": {
                "requestRTSP": self.current_request.get("requestRTSP"),
                "requestStatus": self.current_request.get("requestStatus"),
                "requestFile": self.current_request.get("requestFile"),
                "calibration": {
                    "offsetXmm": CNC_COORD_OFFSET_X_MM,
                    "offsetYmm": CNC_COORD_OFFSET_Y_MM,
                    "scaleX": CNC_COORD_SCALE_X,
                    "scaleY": CNC_COORD_SCALE_Y,
                    "flipX": CNC_COORD_FLIP_X,
                    "flipY": CNC_COORD_FLIP_Y,
                },
                "sourceWidth": round(source_w, 2),
                "sourceHeight": round(source_h, 2),
                "a4WidthPx": round(width_px, 2),
                "a4HeightPx": round(height_px, 2),
                "bboxMm": bbox_mm,
            },
        }

    def _calibrate_point_mm(self, x_mm, y_mm, width_mm, height_mm):
        x = float(x_mm) * float(CNC_COORD_SCALE_X)
        y = float(y_mm) * float(CNC_COORD_SCALE_Y)

        if CNC_COORD_FLIP_X:
            x = float(width_mm) - x
        if CNC_COORD_FLIP_Y:
            y = float(height_mm) - y

        x += float(CNC_COORD_OFFSET_X_MM)
        y += float(CNC_COORD_OFFSET_Y_MM)

        x = min(max(x, 0.0), float(width_mm))
        y = min(max(y, 0.0), float(height_mm))
        return round(x, 2), round(y, 2)

    def _compute_bbox_mm(self, points):
        if not points:
            return None

        xs = [pt[0] for pt in points]
        ys = [pt[1] for pt in points]
        min_x = min(xs)
        max_x = max(xs)
        min_y = min(ys)
        max_y = max(ys)

        return {
            "minX": round(min_x, 2),
            "maxX": round(max_x, 2),
            "minY": round(min_y, 2),
            "maxY": round(max_y, 2),
            "width": round(max_x - min_x, 2),
            "height": round(max_y - min_y, 2),
            "centerX": round((min_x + max_x) / 2.0, 2),
            "centerY": round((min_y + max_y) / 2.0, 2),
            "pointCount": len(points),
        }

    def _send_payload_to_cnc_mqtt(self, task_payload):
        try:
            mqtt = importlib.import_module("paho.mqtt.client")
        except Exception:
            raise RuntimeError("ยังไม่ได้ติดตั้งแพ็กเกจ paho-mqtt (pip install paho-mqtt)")

        if not CNC_MQTT_BROKER_HOST:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TK_CNC_MQTT_BROKER_HOST สำหรับเครื่อง CNC")

        if not CNC_MQTT_TOPIC_PAYLOAD:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TK_CNC_MQTT_TOPIC_PAYLOAD สำหรับเครื่อง CNC")

        payload_json = json.dumps(task_payload, ensure_ascii=False)

        last_error = None
        for attempt in range(1, CNC_MQTT_RETRY + 1):
            client = None
            try:
                payload_client_id = (f"{CNC_MQTT_CLIENT_ID}-pub" if CNC_MQTT_CLIENT_ID else "")
                client = mqtt.Client(client_id=payload_client_id)
                if CNC_MQTT_USERNAME:
                    client.username_pw_set(CNC_MQTT_USERNAME, CNC_MQTT_PASSWORD or None)

                client.connect(CNC_MQTT_BROKER_HOST, CNC_MQTT_BROKER_PORT, keepalive=CNC_MQTT_KEEPALIVE_SEC)
                client.loop_start()

                info = client.publish(CNC_MQTT_TOPIC_PAYLOAD, payload=payload_json, qos=CNC_MQTT_QOS, retain=False)
                if info.rc != mqtt.MQTT_ERR_SUCCESS:
                    raise RuntimeError(f"publish failed (rc={info.rc})")

                if CNC_MQTT_WAIT_FOR_PUBLISH:
                    info.wait_for_publish(timeout=CNC_MQTT_PUBLISH_TIMEOUT_SEC)
                    if not info.is_published():
                        raise RuntimeError("publish timeout")

                return
            except Exception as exc:
                last_error = exc
                if attempt < CNC_MQTT_RETRY:
                    time.sleep(0.5)
            finally:
                if client is not None:
                    try:
                        client.loop_stop()
                    except Exception:
                        pass
                    try:
                        client.disconnect()
                    except Exception:
                        pass

        raise RuntimeError(f"ส่ง payload ไป CNC ผ่าน MQTT ไม่สำเร็จ: {last_error}")

    def _send_emergency_stop_to_cnc_mqtt(self, request_id=None, reason=None):
        try:
            mqtt = importlib.import_module("paho.mqtt.client")
        except Exception:
            raise RuntimeError("ยังไม่ได้ติดตั้งแพ็กเกจ paho-mqtt (pip install paho-mqtt)")

        if not CNC_MQTT_BROKER_HOST:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TK_CNC_MQTT_BROKER_HOST สำหรับเครื่อง CNC")

        if not CNC_MQTT_TOPIC_EMRG:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TK_CNC_MQTT_TOPIC_EMRG สำหรับปุ่มยกเลิก")

        payload_text = "no"

        last_error = None
        for attempt in range(1, CNC_MQTT_RETRY + 1):
            client = None
            try:
                emergency_client_id = (f"{CNC_MQTT_CLIENT_ID}-emrg" if CNC_MQTT_CLIENT_ID else "")
                client = mqtt.Client(client_id=emergency_client_id)
                if CNC_MQTT_USERNAME:
                    client.username_pw_set(CNC_MQTT_USERNAME, CNC_MQTT_PASSWORD or None)

                client.connect(CNC_MQTT_BROKER_HOST, CNC_MQTT_BROKER_PORT, keepalive=CNC_MQTT_KEEPALIVE_SEC)
                client.loop_start()

                info = client.publish(CNC_MQTT_TOPIC_EMRG, payload=payload_text, qos=CNC_MQTT_QOS, retain=False)
                if info.rc != mqtt.MQTT_ERR_SUCCESS:
                    raise RuntimeError(f"publish failed (rc={info.rc})")

                if CNC_MQTT_WAIT_FOR_PUBLISH:
                    info.wait_for_publish(timeout=CNC_MQTT_PUBLISH_TIMEOUT_SEC)
                    if not info.is_published():
                        raise RuntimeError("publish timeout")

                return
            except Exception as exc:
                last_error = exc
                if attempt < CNC_MQTT_RETRY:
                    time.sleep(0.5)
            finally:
                if client is not None:
                    try:
                        client.loop_stop()
                    except Exception:
                        pass
                    try:
                        client.disconnect()
                    except Exception:
                        pass

        raise RuntimeError(f"ส่งคำสั่ง emergency stop ไป CNC ผ่าน MQTT ไม่สำเร็จ: {last_error}")

    def _extract_status_from_message(self, payload_text):
        text = str(payload_text or "").strip()
        if not text:
            return None

        try:
            parsed = json.loads(text)
        except Exception:
            parsed = None

        if isinstance(parsed, dict):
            for key in ("status", "machineStatus", "state"):
                value = parsed.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip().lower()

        if isinstance(parsed, str) and parsed.strip():
            return parsed.strip().lower()

        return text.lower()

    def _schedule_status_queue_drain(self):
        if self._status_poll_after_id:
            return
        self._status_poll_after_id = self.after(150, self._drain_status_queue)

    def _drain_status_queue(self):
        self._status_poll_after_id = None
        while True:
            try:
                status = self._status_queue.get_nowait()
            except queue.Empty:
                break

            self._handle_machine_status_update(status)

        self._schedule_status_queue_drain()

    def _start_mqtt_status_listener(self):
        if self._status_mqtt_client is not None:
            return True
        if not CNC_MQTT_BROKER_HOST or not CNC_MQTT_TOPIC_STATUS:
            return False

        try:
            mqtt = importlib.import_module("paho.mqtt.client")
        except Exception:
            print("Execution Page: paho-mqtt not installed, skip status listener")
            return False

        def _on_connect(client, _userdata, _flags, rc):
            if rc == 0:
                client.subscribe(CNC_MQTT_TOPIC_STATUS, qos=CNC_MQTT_STATUS_QOS)
            else:
                print(f"Execution Page: MQTT status connect failed rc={rc}")

        def _on_message(_client, _userdata, msg):
            try:
                payload_text = msg.payload.decode("utf-8", errors="ignore")
                status = self._extract_status_from_message(payload_text)
                if status:
                    self._status_queue.put(status)
            except Exception:
                pass

        status_client_id = (f"{CNC_MQTT_CLIENT_ID}-status" if CNC_MQTT_CLIENT_ID else "")
        client = mqtt.Client(client_id=status_client_id)
        if CNC_MQTT_USERNAME:
            client.username_pw_set(CNC_MQTT_USERNAME, CNC_MQTT_PASSWORD or None)
        client.on_connect = _on_connect
        client.on_message = _on_message

        try:
            client.connect(CNC_MQTT_BROKER_HOST, CNC_MQTT_BROKER_PORT, keepalive=CNC_MQTT_KEEPALIVE_SEC)
            client.loop_start()
            self._status_mqtt_client = client
            return True
        except Exception as exc:
            print(f"Execution Page: start MQTT status listener failed: {exc}")
            return False

    def _stop_mqtt_status_listener(self):
        client = self._status_mqtt_client
        self._status_mqtt_client = None
        if client is None:
            return

        try:
            if CNC_MQTT_TOPIC_STATUS:
                client.unsubscribe(CNC_MQTT_TOPIC_STATUS)
        except Exception:
            pass

        try:
            client.loop_stop()
        except Exception:
            pass

        try:
            client.disconnect()
        except Exception:
            pass

    def _schedule_backend_status_poll(self, delay_ms=1500):
        if self._backend_status_after_id:
            return
        self._backend_status_after_id = self.after(delay_ms, self._poll_backend_status_once)

    def _start_backend_status_polling(self):
        self._schedule_backend_status_poll(300)

    def _stop_backend_status_polling(self):
        if self._backend_status_after_id:
            try:
                self.after_cancel(self._backend_status_after_id)
            except Exception:
                pass
            self._backend_status_after_id = None

    def _poll_backend_status_once(self):
        self._backend_status_after_id = None
        try:
            response = requests.get(
                build_api_url("/srs/machine/status"),
                timeout=3,
                headers=build_auth_headers(self.controller),
            )
            if response.status_code == 200:
                payload = response.json() if response.content else {}
                status = payload.get("machineState") or payload.get("status")
                if status:
                    self._status_queue.put(str(status).lower())
        except Exception:
            pass
        finally:
            self._schedule_backend_status_poll(1500)

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
        top_bar = tk.Frame(self, bg="#1E293B", height=60)
        top_bar.pack(side="top", fill="x")
        top_bar.pack_propagate(False)

        self.status_lbl = tk.Label(top_bar, text="● MACHINE READY", font=("Arial", 14, "bold"), bg="#1E293B", fg="#10B981")
        self.status_lbl.pack(side="left", padx=20, pady=15)

        tk.Button(top_bar, text="← กลับหน้าหลัก", bg="#334155", fg="white", relief="flat", command=lambda: self.controller.show_frame("DashboardPage")).pack(side="right", padx=16)

        main_container = tk.Frame(self, bg="#111827")
        main_container.pack(fill="both", expand=True, padx=12, pady=(6, 6))

        sig_frame = tk.LabelFrame(main_container, text=" กล้องเฝ้าหน้างาน CNC ", bg="#111827", fg="white")
        sig_frame.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        # Changed from Canvas to Frame to hold the VLC Video Output
        self.camera_view = tk.Frame(sig_frame, bg="#000000", width=400, height=300)
        self.camera_view.pack(fill="both", expand=True, pady=10, padx=10)
        
        # Label for showing placeholder text when no stream is active
        self.placeholder_lbl = tk.Label(self.camera_view, bg="#000000", fg="#E2E8F0", font=("Arial", 11), justify="center")
        self.show_camera_placeholder("รอเริ่มงานลงนาม")

        tk.Button(sig_frame, text="REFRESH VIEW", bg="#64748B", fg="white", font=("Arial", 10), command=self.refresh_camera_view).pack(fill="x", padx=10, pady=(0, 6))

        btn_frame = tk.Frame(main_container, bg="#111827")
        btn_frame.pack(fill="x", pady=(0, 6))

        self.start_btn = tk.Button(btn_frame, text="START CNC SIGNING", bg="#10B981", fg="white", font=("Arial", 10, "bold"), padx=12, pady=8, command=self.start_signing)
        self.start_btn.pack(side="left", padx=6, fill="x", expand=True)

        tk.Button(btn_frame, text="CANCEL", bg="#EF4444", fg="white", font=("Arial", 10, "bold"), padx=12, pady=8, command=self.cancel_action).pack(side="left", padx=6, fill="x", expand=True)

        self.set_machine_status("ready")
        self._unlock_start_button_for_new_request()

    def setup_canvas_events(self):
        self.bind("<Destroy>", self._on_destroy)

    def _on_destroy(self, event):
        if event.widget is self:
            if self._status_poll_after_id:
                try:
                    self.after_cancel(self._status_poll_after_id)
                except Exception:
                    pass
                self._status_poll_after_id = None
            self._stop_backend_status_polling()
            self._stop_mqtt_status_listener()
            # Ensure VLC is stopped when widget is destroyed
            self._stop_camera_stream(show_placeholder=False)

    def _get_rtsp_url(self):
        rtsp = os.getenv("TK_EXEC_RTSP_URL")
        rtsp = str(rtsp or "").strip()
        if not rtsp or rtsp.lower() == "none":
            return None
            
        return rtsp

    def _start_camera_stream(self, rtsp_url):
        # Stop existing stream if any
        self._stop_camera_stream(show_placeholder=False)
        self.show_camera_placeholder(f"กำลังเชื่อมต่อกล้อง:\n{rtsp_url}")
        
        # Hide the placeholder label to let VLC render video
        self.placeholder_lbl.place_forget()

        try:
            # Create a VLC Instance with network caching configuration to reduce latency
            self.vlc_instance = vlc.Instance("--network-caching=300", "--drop-late-frames", "--skip-frames")
            self.vlc_player = self.vlc_instance.media_player_new()
            
            # Load the RTSP media
            media = self.vlc_instance.media_new(rtsp_url)
            self.vlc_player.set_media(media)

            # Get the window ID of the Tkinter Frame to attach the VLC player to it
            window_id = self.camera_view.winfo_id()

            # Attach player to the window depending on the operating system
            if sys.platform.startswith('linux'):
                # For Linux (Raspberry Pi), requires X11 windowing system (Not Wayland)
                self.vlc_player.set_xwindow(window_id)
            elif sys.platform == "win32":
                # For Windows
                self.vlc_player.set_hwnd(window_id)
            elif sys.platform == "darwin":
                # For macOS
                self.vlc_player.set_nsobject(window_id)

            # Start playback
            self.vlc_player.play()
            self.camera_running = True
            
        except Exception as e:
            self._stop_camera_stream(show_placeholder=False)
            self.show_camera_placeholder(f"เชื่อมต่อ RTSP ไม่สำเร็จ:\n{e}")

    def _stop_camera_stream(self, show_placeholder=True):
        self.camera_running = False

        # Stop and release VLC player
        if self.vlc_player is not None:
            try:
                self.vlc_player.stop()
            except Exception:
                pass
            self.vlc_player = None

        if self.vlc_instance is not None:
            self.vlc_instance = None

        if show_placeholder and hasattr(self, "camera_view"):
            self.show_camera_placeholder("รอเริ่มงานลงนาม")

    def show_camera_placeholder(self, text):
        # Clear VLC context visually by forcing the placeholder label to show up
        if hasattr(self, "placeholder_lbl"):
            self.placeholder_lbl.config(text=f"CNC LIVE MONITOR\n\n{text}")
            self.placeholder_lbl.place(relx=0.5, rely=0.5, anchor="center")

    def refresh_camera_view(self):
        rtsp = self._get_rtsp_url()
        if rtsp:
            self._start_camera_stream(rtsp)
        else:
            self._stop_camera_stream(show_placeholder=False)
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

        default_w, default_h = self._a4_px_size()
        self.paper_width = self._to_positive_float(self.paper_width, default_w)
        self.paper_height = self._to_positive_float(self.paper_height, default_h)

        self.sign_command_sent = False
        self.running_signing = False
        self._signing_progress_value = 0
        self._completion_handled = False
        self._seen_active_state_for_job = False
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
            except Exception:
                pass

    def start_signing(self):
        if self._start_locked_for_request:
            return

        if self.running_signing:
            return

        self.running_signing = True
        try:
            if hasattr(self, "start_btn"):
                try:
                    self.start_btn.config(state="disabled")
                except Exception:
                    pass

            if not self.current_request:
                messagebox.showwarning("Warning", "ไม่พบข้อมูลงานลงนาม", parent=self.winfo_toplevel())
                return

            request_id = self.current_request.get("requestId")
            if not request_id:
                messagebox.showwarning("Warning", "ไม่พบ requestId ของคำร้อง จึงไม่สามารถเริ่ม CNC ได้", parent=self.winfo_toplevel())
                return

            if not self.signature_points:
                messagebox.showwarning("Warning", "ไม่พบพิกัดลายเซ็น กรุณากลับไปยืนยันจากหน้า Preview", parent=self.winfo_toplevel())
                return

            try:
                task_payload = self._build_signature_task_payload(request_id)
                file_path = self._save_signature_task_file(request_id, task_payload)
                self._send_payload_to_cnc_mqtt(task_payload)
                print(f"Execution Page: บันทึกไฟล์งานแล้วที่ {file_path}")
                print(f"Execution Page: ส่ง payload ไป CNC ผ่าน MQTT แล้ว (requestId={request_id})")
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
                self._completion_handled = False
                self._seen_active_state_for_job = False
                self._lock_start_button_for_request()

            self.running_signing = True
            self.set_machine_status("homing")
        finally:
            if not self.sign_command_sent:
                self.running_signing = False

    def cancel_action(self):
        if not messagebox.askyesno("ยืนยัน", "ยกเลิกงานนี้และปฏิเสธคำร้องใช่หรือไม่?", parent=self.winfo_toplevel()):
            return

        reason = prompt_reject_reason(self.winfo_toplevel())
        if reason is None:
            return

        req_id = self.current_request.get("requestId") if self.current_request else None
        try:
            self._send_emergency_stop_to_cnc_mqtt(request_id=req_id, reason=reason)
            print(f"Execution Page: ส่ง emergency stop ไป CNC ผ่าน MQTT แล้ว (topic={CNC_MQTT_TOPIC_EMRG})")
        except Exception as e:
            messagebox.showerror("Error", f"ส่งคำสั่งหยุดฉุกเฉินไป CNC ไม่สำเร็จ: {e}", parent=self.winfo_toplevel())
            return

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
        self._stop_camera_stream(show_placeholder=False)
        self.show_camera_placeholder("หยุดฉุกเฉินแล้ว - โปรดตรวจสอบเครื่อง CNC")
        self.running_signing = False
        self.sign_command_sent = False
        self._signing_progress_value = 0
        self._completion_handled = False
        self._seen_active_state_for_job = False
        if hasattr(self.controller, "end_signing_flow_lock"):
            self.controller.end_signing_flow_lock()
        self.controller.show_frame("DashboardPage")