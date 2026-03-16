import tkinter as tk
from tkinter import messagebox
import requests
from PIL import Image, ImageTk, ImageOps, ImageDraw
from io import BytesIO
import json

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
        self.backend_url = "http://192.168.1.39:5000" # Update to your actual backend IP
        self.current_doc = None
        self.orig_img = None  
        self.paths = []       
        self.zoom_level = 1.0

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
        tk.Button(toolbar, text="START SIGNING (CNC)", font=("Arial", 10, "bold"), bg="#10B981", fg="#FFFFFF", 
                  relief="flat", padx=20, command=lambda: self.controller.show_frame("PinConfirmPage")).pack(side="right", padx=15)

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

    # --- Logic Methods (Refactored from your original code) ---
    def fetch_doc(self):
        # Implementation to get pending doc from Backend
        # For now, showing a simple message to confirm it's connected
        messagebox.showinfo("API", "Fetching latest request from backend...")
        # (Paste your existing fetch_doc logic here and adjust self references)

    def render_left_canvas(self):
        if not self.orig_img: return
        w, h = self.orig_img.size
        new_size = (int(w * self.zoom_level), int(h * self.zoom_level))
        resized = self.orig_img.resize(new_size, Image.Resampling.LANCZOS)
        self.tk_left_img = ImageTk.PhotoImage(resized)
        
        self.left_canvas.delete("all")
        self.left_canvas.create_image(0, 0, image=self.tk_left_img, anchor=tk.NW)
        self.left_canvas.config(scrollregion=(0, 0, new_size[0], new_size[1]))
        self.zoom_lbl.config(text=f"{int(self.zoom_level * 100)}%")

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
        # Logic to map coordinates and show preview window before CNC
        if not self.paths:
            messagebox.showwarning("Warning", "Please provide a signature first.")
            return
        messagebox.showinfo("Simulation", "Calculating CNC paths and showing preview...")