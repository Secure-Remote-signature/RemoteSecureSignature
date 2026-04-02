import tkinter as tk
from tkinter import ttk

class IncomingAlert(tk.Toplevel):
    def __init__(self, parent, data, on_accept, on_reject, on_view=None):
        super().__init__(parent)
        self.title("New Request")
        window_width = 450
        window_height = 420
        self.update_idletasks()
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        
        x_pos = int((screen_width / 2) - (window_width / 2))
        y_pos = int((screen_height / 2) - (window_height / 2))
        
        self.geometry(f"{window_width}x{window_height}+{x_pos}+{y_pos}")
        
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.configure(bg="#FFFFFF")
        
        self.on_accept = on_accept
        self.on_reject = on_reject
        self.on_view = on_view if on_view is not None else on_accept

        header = tk.Frame(self, bg="#5D5CDE", height=50)
        header.pack(fill="x")
        
        header_label = tk.Label(header, text="มีเอกสารรอการลงนาม!!", font=("Arial", 14, "bold"), 
            bg="#5D5CDE", fg="white")
        header_label.pack(pady=10)

        header.bind("<ButtonPress-1>", self._start_drag)
        header_label.bind("<ButtonPress-1>", self._start_drag)
        
        header.bind("<B1-Motion>", self._on_drag)
        header_label.bind("<B1-Motion>", self._on_drag)

        content = tk.Frame(self, bg="#FFFFFF", padx=20, pady=15)
        content.pack(fill="both", expand=True)

        def add_info(label, text):
            row = tk.Frame(content, bg="#FFFFFF")
            row.pack(fill="x", pady=5)
            tk.Label(row, text=label, font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#1E293B", width=8, anchor="w").pack(side="left")
            tk.Label(row, text=text, font=("Arial", 11), bg="#FFFFFF", fg="#475569").pack(side="left", padx=5)

        first_name = (data.get('studentName') or '').strip()
        last_name = (data.get('studentLastName') or data.get('studentLastname') or '').strip()
        sender_name = f"{first_name} {last_name}".strip() or 'ไม่ระบุชื่อ'

        add_info("ผู้ส่ง:", sender_name)
        add_info("เลขที่:", data.get('requestNumber', '-'))
        add_info("เรื่อง:", data.get('requestSubject') or data.get('requestMessage', 'ไม่มีรายละเอียด'))
        
        # --- detail ---
        tk.Label(content, text="ข้อความจากผู้ส่ง:", font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#1E293B").pack(anchor="w", pady=(10, 5))
        detail_box = tk.Text(content, font=("Arial", 10), bg="#F8FAFC", relief="flat", height=4, padx=10, pady=10)
        detail_box.insert("1.0", data.get("requestMessage", "ไม่มีรายละเอียดเพิ่มเติม"))
        detail_box.config(state="disabled")
        detail_box.pack(fill="x")

        view_link = tk.Label(content, text="คลิกเพื่อดูตัวอย่างเอกสาร", font=("Arial", 10, "underline"), 
                             bg="#FFFFFF", fg="#5D5CDE", cursor="hand2")
        view_link.pack(pady=10)
        view_link.bind("<Button-1>", self._on_view_click)

        # --- Buttons ---
        btn_frame = tk.Frame(content, bg="#FFFFFF")
        btn_frame.pack(fill="x", pady=10)
        tk.Button(btn_frame, text="ลงนามเอกสาร", bg="#5D5CDE", fg="white", font=("Arial", 11, "bold"),
            relief="flat", width=18, pady=8, cursor="hand2",
            command=self._on_accept_click).pack(side="left", expand=True, padx=5)
        tk.Button(btn_frame, text="ปฏิเสธ", bg="#E11D48", fg="white", font=("Arial", 11, "bold"),
            relief="flat", width=18, pady=8, cursor="hand2",
            command=self._on_reject_click).pack(side="left", expand=True, padx=5)
    
    def _start_drag(self, event):
        self._drag_start_x = event.x
        self._drag_start_y = event.y

    def _on_drag(self, event):
        x = self.winfo_x() - self._drag_start_x + event.x
        y = self.winfo_y() - self._drag_start_y + event.y
        self.geometry(f"+{x}+{y}")
        
    def _on_accept_click(self):
        self.destroy()
        self.on_accept()
    
    def _on_reject_click(self):
        self.destroy()
        self.on_reject()
    
    def _on_view_click(self, event):
        self.destroy()
        self.on_view()