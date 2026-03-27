import tkinter as tk
from tkinter import messagebox
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

class MainApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.shared_data = {}  # Dictionary to hold any data that needs to be shared across pages
        self.current_user_id = None
        self.current_user = None
        self.user_role = None
        self.auth_token = None
        
        # --- Window Setup ---
        self.title("Secure Remote Signature")
        self.geometry("1024x600")
        self.configure(bg="#F9FAFB")

        # --- Main Container (This was missing) ---
        container = tk.Frame(self)
        container.pack(fill="both", expand=True)
        container.grid_rowconfigure(0, weight=1)
        container.grid_columnconfigure(0, weight=1)

        self.frames = {}
        
        # --- 2. Add the new pages to the initialization list ---
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
            ChangePasswordPage
        )

        for PageClass in page_list:
            page_name = PageClass.__name__
            # Assign the page to the 'container' frame
            frame = PageClass(parent=container, controller=self)
            self.frames[page_name] = frame
            
            # Stack them all in the same grid spot
            frame.grid(row=0, column=0, sticky="nsew")

        # Start the app at the Login Page
        self.show_frame("LoginPage") # Change to "LoginPage" after testing signature page

    def logout(self):
        if messagebox.askyesno("Logout", "คุณต้องการออกจากระบบใช่หรือไม่?"):
            self.current_user_id = None
            self.current_user = None
            self.user_role = None
            self.auth_token = None
            self.show_frame("LoginPage")

    def show_frame(self, page_name, data=None):
        """Switch to a page by its class name string"""
        if page_name in self.frames:
            frame = self.frames[page_name]
            
            # Cleanup modals from any page that might have them
            for fname in ["ExecutionPage"]:
                if fname in self.frames and hasattr(self.frames[fname], "cleanup_modals"):
                    self.frames[fname].cleanup_modals()
            
            def update_user_info(self):
                self.prof_id = self.controller.current_user_id
                print(f"DEBUG: Dashboard updated for Prof ID: {self.prof_id}")
            
            if hasattr(frame, "clear_fields"):
                frame.clear_fields()
            
            if data is not None and hasattr(frame, "set_request_data"):
                frame.set_request_data(data)
            
            # Special logic: Update user info before showing Dashboard (จะเรียก poll_for_requests ใหม่)
            if page_name == "DashboardPage" and hasattr(frame, "update_user_info"):
                frame.update_user_info()
                
            if page_name == "SettingPage" and hasattr(frame, "load_user_data"):
                frame.load_user_data()  # Load user data when opening settings

            if page_name == "HistoryPage" and hasattr(frame, "load_history_from_backend"):
                frame.load_history_from_backend()
                
            frame.tkraise()
        else:
            print(f"Error: Page '{page_name}' not found!")

if __name__ == "__main__":
    app = MainApp()
    app.mainloop()