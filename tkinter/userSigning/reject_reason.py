import tkinter as tk
from tkinter import simpledialog, messagebox


def prompt_reject_reason(parent, title="เหตุผลการปฏิเสธ"):
    while True:
        reason = simpledialog.askstring(
            title,
            "กรุณาระบุเหตุผลที่ปฏิเสธคำร้อง:",
            parent=parent,
        )

        if reason is None:
            return None

        cleaned = reason.strip()
        if cleaned:
            return cleaned

        messagebox.showwarning("ข้อมูลไม่ครบ", "กรุณาระบุเหตุผลก่อนยืนยัน", parent=parent)
