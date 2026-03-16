import tkinter as tk
from login import LoginPage
from dashboard import DashboardPage
from signature import SignaturePage
from setting import SettingPage
from history import HistoryPage
from pin_confirm import PinConfirmPage
from execution import ExecutionPage
from forgot_password import ForgotPasswordPage
from reset_password import ResetPasswordPage
from change_password import ChangePasswordPage

class MainApp(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.current_user_id = None
        self.current_user = None
        self.user_role = None
        
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

    def show_frame(self, page_name):
        """Switch to a page by its class name string"""
        if page_name in self.frames:
            frame = self.frames[page_name]
            
            # Special logic: Update user info before showing Dashboard
            if page_name == "DashboardPage" and hasattr(frame, "update_user_info"):
                frame.update_user_info()
                
            if page_name == "SettingPage":
                frame.load_user_data()  # Load user data when opening settings
                
            frame.tkraise()
        else:
            print(f"Error: Page '{page_name}' not found!")

if __name__ == "__main__":
    app = MainApp()
    app.mainloop()