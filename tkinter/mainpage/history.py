import tkinter as tk
from tkinter import messagebox

class HistoryPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        
        # --- Top Navigation Bar ---
        top_bar = tk.Frame(self, bg="#FFFFFF", height=80, bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        top_bar.pack(side="top", fill="x")
        
        tk.Label(top_bar, text="Signing Logs", font=("Arial", 22, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(side="left", padx=30, pady=20)
        
        tk.Button(top_bar, text="BACK", font=("Arial", 12, "bold"), 
                  bg="#64748B", fg="#FFFFFF", relief="flat", padx=30,
                  command=lambda: controller.show_frame("DashboardPage")).pack(side="right", padx=30)

        # --- List Header ---
        header_frame = tk.Frame(self, bg="#F1F5F9") # Grayer background for header
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

        self.load_history_from_web_spec()

    def load_history_from_web_spec(self):
        mock_logs = [
            { 'id': 'srs-001', 'docName': 'เอกสารอนุมัติจบการศึกษา', 'sender': 'สมหญิง ใจดี', 'date': '25/02/26 14:30', 'status': 'success' },
            { 'id': 'srs-002', 'docName': 'ใบขอเบิกงบประมาณโครงการ', 'sender': 'ฝ่ายการเงิน', 'date': '25/02/26 10:15', 'status': 'success' },
            { 'id': 'srs-003', 'docName': 'หนังสือขออนุญาตใช้สถานที่', 'sender': 'สมชาย รักเรียน', 'date': '24/02/26 16:45', 'status': 'failed' },
            { 'id': 'srs-004', 'docName': 'สัญญาจ้างผู้รับเหมา CNC', 'sender': 'ฝ่ายจัดซื้อ', 'date': '24/02/26 09:00', 'status': 'processing' },
            { 'id': 'srs-005', 'docName': 'แบบฟอร์มขอลาพักร้อน', 'sender': 'มานะ อดทน', 'date': '23/02/26 11:20', 'status': 'success' },
            { 'id': 'srs-006', 'docName': 'บันทึกข้อความภายใน', 'sender': 'ธุรการ', 'date': '22/02/26 08:30', 'status': 'success' },
        ]
        
        for log in mock_logs:
            # สร้างตัวแผ่น Card (เพิ่ม pady เพื่อให้เห็นช่องว่างระหว่างแถวชัดขึ้น)
            item_frame = tk.Frame(self.scrollable_frame, bg="#FFFFFF", bd=0, 
                                  highlightthickness=1, highlightbackground="#E2E8F0")
            item_frame.pack(fill="x", pady=6, padx=15, ipady=15) 

            # --- การวางตำแหน่งแบบเว้นระยะขอบ (Margin) ---
            # เริ่มต้นที่ relx=0.02 แทน 0.0 เพื่อไม่ให้ชิดขอบซ้าย
            tk.Label(item_frame, text=log['id'], font=("Arial", 12), bg="#FFFFFF", fg="#94A3B8").place(relx=0.02, relwidth=0.08, rely=0.5, anchor="w")
            
            tk.Label(item_frame, text=log['docName'], font=("Arial", 12, "bold"), bg="#FFFFFF", fg="#1E293B", anchor="w").place(relx=0.12, relwidth=0.33, rely=0.5, anchor="w")
            
            tk.Label(item_frame, text=log['sender'], font=("Arial", 12), bg="#FFFFFF", fg="#475569", anchor="w").place(relx=0.46, relwidth=0.15, rely=0.5, anchor="w")
            
            tk.Label(item_frame, text=log['date'], font=("Arial", 12), bg="#FFFFFF", fg="#64748B", anchor="w").place(relx=0.62, relwidth=0.16, rely=0.5, anchor="w")
            
            # Status Badge (ปรับความกว้างให้พอดี ไม่ให้บวมไปทับเส้น)
            status_style = self.get_status_style(log['status'])
            status_text = "สำเร็จ" if log['status'] == 'success' else "ล้มเหลว" if log['status'] == 'failed' else "กำลังทำ"
            
            status_lbl = tk.Label(item_frame, text=status_text, font=("Arial", 10, "bold"), 
                                  bg=status_style['bg'], fg=status_style['fg'], 
                                  padx=10, pady=4, bd=0)
            status_lbl.place(relx=0.80, relwidth=0.10, rely=0.5, anchor="w")

            # ปุ่ม VIEW (👁) / หรือคำว่า "ดู"
            # ขยับ relx เข้ามาเป็น 0.92 เพื่อให้มี Margin ขอบขวา
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
        detail_msg = f"ID: {log['id']}\nDocument: {log['docName']}\nSender: {log['sender']}\nDate: {log['date']}\nStatus: {log['status']}"
        messagebox.showinfo("Log Detail", detail_msg)