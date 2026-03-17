import tkinter as tk
from tkinter import ttk

class IncomingAlert(tk.Toplevel):
    def __init__(self, parent, data, on_accept, on_reject):
        super().__init__(parent)
        self.title("New Request")
        self.geometry("450x420+500+200") # เพิ่มความสูงเล็กน้อย
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.configure(bg="#FFFFFF")

        # --- Header ---
        header = tk.Frame(self, bg="#5D5CDE", height=50)
        header.pack(fill="x")
        tk.Label(header, text="มีเอกสารรอการลงนาม!!", font=("Arial", 14, "bold"), 
                 bg="#5D5CDE", fg="white").pack(pady=10)

        # --- Content Container ---
        content = tk.Frame(self, bg="#FFFFFF", padx=20, pady=15)
        content.pack(fill="both", expand=True)

        def add_info(label, text):
            row = tk.Frame(content, bg="#FFFFFF")
            row.pack(fill="x", pady=5)
            tk.Label(row, text=label, font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#1E293B", width=8, anchor="w").pack(side="left")
            tk.Label(row, text=text, font=("Arial", 11), bg="#FFFFFF", fg="#475569").pack(side="left", padx=5)

        add_info("ผู้ส่ง:", data.get('studentName', 'ไม่ระบุชื่อ'))
        add_info("เลขที่:", data.get('requestNumber', '-'))
        add_info("เรื่อง:", data.get('requestMessage', 'ไม่มีรายละเอียด'))
        
        # --- detail ---
        tk.Label(content, text="ข้อความจากผู้ส่ง:", font=("Arial", 11, "bold"), bg="#FFFFFF", fg="#1E293B").pack(anchor="w", pady=(10, 5))
        detail_box = tk.Text(content, font=("Arial", 10), bg="#F8FAFC", relief="flat", height=4, padx=10, pady=10)
        detail_box.insert("1.0", data.get("requestMessage", "ไม่มีรายละเอียดเพิ่มเติม"))
        detail_box.config(state="disabled")
        detail_box.pack(fill="x")

        view_link = tk.Label(content, text="คลิกเพื่อดูตัวอย่างเอกสาร", font=("Arial", 10, "underline"), 
                             bg="#FFFFFF", fg="#5D5CDE", cursor="hand2")
        view_link.pack(pady=10)
        view_link.bind("<Button-1>", lambda e: [self.destroy(), on_accept()])

        # --- Buttons ---
        btn_frame = tk.Frame(content, bg="#FFFFFF")
        btn_frame.pack(fill="x", pady=10)
        tk.Button(btn_frame, text="ลงนามเอกสาร", bg="#5D5CDE", fg="white", font=("Arial", 11, "bold"),
                  relief="flat", width=18, pady=8, cursor="hand2",
                  command=lambda: [self.destroy(), on_accept()]).pack(side="left", expand=True, padx=5)
        tk.Button(btn_frame, text="ปฏิเสธ", bg="#E11D48", fg="white", font=("Arial", 11, "bold"),
                  relief="flat", width=18, pady=8, cursor="hand2",
                  command=lambda: [self.destroy(), on_reject()]).pack(side="left", expand=True, padx=5)