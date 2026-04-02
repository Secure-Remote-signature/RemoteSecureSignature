import tkinter as tk
from tkinter import messagebox, ttk
from userLogin.login import LoginPage
from mainpage.dashboard import DashboardPage
from userSigning.signature import SignaturePage
from mainpage.setting import SettingPage
from mainpage.history import HistoryPage
from userSigning.pin_confirm import PinConfirmPage
from userSigning.execution import ExecutionPage
from userSigning.document_review import DocumentReviewPage
from userLogin.forgot_password import ForgotPasswordPage
from userLogin.reset_password import ResetPasswordPage
from userLogin.change_password import ChangePasswordPage
from userLogin.forgot_pin import ForgotPinPage
from userLogin.change_pin import ChangePinPage

class MainApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.shared_data = {}
        self.current_user_id = None
        self.current_user = None
        self.user_role = None
        self.auth_token = None
        self.signing_flow_locked = False
        self.signing_flow_request_id = None
        

        self.title("Secure Remote Signature")
        self.geometry("800x444")
        self.configure(bg="#F9FAFB")

        outer_frame = tk.Frame(self, bg="#F9FAFB")
        outer_frame.pack(fill="both", expand=True)
        outer_frame.grid_rowconfigure(0, weight=1)
        outer_frame.grid_columnconfigure(0, weight=1)

        self.v_scrollbar = ttk.Scrollbar(outer_frame, orient="vertical")
        
        self.canvas = tk.Canvas(outer_frame, bg="#F9FAFB", highlightthickness=0, 
                                yscrollcommand=self.v_scrollbar.set)
        
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.v_scrollbar.grid(row=0, column=1, sticky="ns")
        self.v_scrollbar.config(command=self.canvas.yview)

        container = tk.Frame(self.canvas, bg="#F9FAFB")
        
        self.canvas_window = self.canvas.create_window((0, 0), window=container, anchor="nw")

        container.grid_rowconfigure(0, weight=1)
        container.grid_columnconfigure(0, weight=1)

        container.bind("<Configure>", self._on_frame_configure)
        self.canvas.bind("<Configure>", self._on_canvas_configure)

        self.frames = {}
        
        page_list = (
            LoginPage, 
            DashboardPage, 
            SignaturePage, 
            DocumentReviewPage,
            SettingPage, 
            HistoryPage, 
            PinConfirmPage,
            ExecutionPage,
            ForgotPasswordPage,
            ResetPasswordPage,
            ChangePasswordPage,
            ForgotPinPage,
            ChangePinPage,
        )

        for PageClass in page_list:
            page_name = PageClass.__name__
            frame = PageClass(parent=container, controller=self)
            self.frames[page_name] = frame
            
            frame.grid(row=0, column=0, sticky="nsew")

        self.show_frame("LoginPage")

    def _on_frame_configure(self, event):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        self.check_scrollbar()

    def _on_canvas_configure(self, event):
        self.canvas.itemconfig(self.canvas_window, width=event.width)
        self.check_scrollbar()

    def check_scrollbar(self):
        self.update_idletasks() 
        bbox = self.canvas.bbox("all")
        
        if bbox:
            content_height = bbox[3]
            canvas_height = self.canvas.winfo_height()
            
            if content_height > canvas_height:
                self.v_scrollbar.grid()
            else:
                self.v_scrollbar.grid_remove()

    def logout(self):
        if self.signing_flow_locked:
            messagebox.showwarning(
                "กำลังดำเนินการลงนาม",
                "ยังออกจากระบบไม่ได้ ต้องเซ็นให้เสร็จหรือปฏิเสธการลงนามก่อน",
            )
            return

        if messagebox.askyesno("Logout", "คุณต้องการออกจากระบบใช่หรือไม่?"):
            self.current_user_id = None
            self.current_user = None
            self.user_role = None
            self.auth_token = None
            self.show_frame("LoginPage")

    def start_signing_flow_lock(self, request_data=None):
        request_id = None
        if isinstance(request_data, dict):
            if isinstance(request_data.get("request"), dict):
                request_id = request_data.get("request", {}).get("requestId")
            if not request_id:
                request_id = request_data.get("requestId")

        self.signing_flow_locked = True
        if request_id:
            self.signing_flow_request_id = request_id

    def end_signing_flow_lock(self):
        self.signing_flow_locked = False
        self.signing_flow_request_id = None

    def _is_page_allowed_while_signing_locked(self, page_name):
        allowed_pages = {
            "DocumentReviewPage",
            "SignaturePage",
            "PinConfirmPage",
            "ExecutionPage",
            "ForgotPinPage",
        }
        return page_name in allowed_pages

    def show_frame(self, page_name, data=None):
        if page_name in self.frames:
            if self.signing_flow_locked and not self._is_page_allowed_while_signing_locked(page_name):
                messagebox.showwarning(
                    "ยังออกจากขั้นตอนลงนามไม่ได้",
                    "เพื่อป้องกันสถานะค้าง กรุณาเซ็นให้เสร็จหรือปฏิเสธการลงนามก่อน",
                )
                return

            if page_name in {"DocumentReviewPage", "SignaturePage", "PinConfirmPage", "ExecutionPage"}:
                self.start_signing_flow_lock(data)

            frame = self.frames[page_name]
            
            for fname in ["ExecutionPage"]:
                if fname in self.frames and hasattr(self.frames[fname], "cleanup_modals"):
                    self.frames[fname].cleanup_modals()
            
            if hasattr(frame, "clear_fields"):
                frame.clear_fields()
            
            if data is not None and hasattr(frame, "set_request_data"):
                frame.set_request_data(data)
            
            if page_name == "DashboardPage" and hasattr(frame, "update_user_info"):
                frame.update_user_info()
                
            if page_name == "SettingPage" and hasattr(frame, "load_user_data"):
                frame.load_user_data()  # Load user data when opening settings

            if page_name == "HistoryPage" and hasattr(frame, "load_history_from_backend"):
                frame.load_history_from_backend()
                
            self.canvas.yview_moveto(0)
                
            frame.tkraise()
            self.check_scrollbar()
        else:
            print(f"Error: Page '{page_name}' not found!")

if __name__ == "__main__":
    app = MainApp()
    app.mainloop()