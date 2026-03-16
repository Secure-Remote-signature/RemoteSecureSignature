import tkinter as tk
from tkinter import messagebox

class PinConfirmPage(tk.Frame):
    def __init__(self, parent, controller):
        # Background: #F9FAFB
        super().__init__(parent, bg="#F9FAFB")
        self.controller = controller
        self.pin_code = "" # Store entered digits
        self.correct_pin = "1234" # Mock PIN for testing
        
        # --- UI Setup ---
        # Center Container (The Card)
        container = tk.Frame(self, bg="#FFFFFF", bd=0, highlightthickness=1, highlightbackground="#E5E7EB")
        container.place(relx=0.5, rely=0.5, anchor="center", width=400, height=550)

        # Title
        tk.Label(container, text="Security Verification", font=("Arial", 18, "bold"), 
                 bg="#FFFFFF", fg="#1E293B").pack(pady=(30, 10))
        
        tk.Label(container, text="Enter your 4-digit PIN to confirm", font=("Arial", 11), 
                 bg="#FFFFFF", fg="#64748B").pack(pady=(0, 20))

        # --- PIN Display (The Dots) ---
        self.dots_label = tk.Label(container, text="○ ○ ○ ○", font=("Arial", 30), 
                                   bg="#FFFFFF", fg="#4F46E5")
        self.dots_label.pack(pady=20)

        # --- Numpad Grid ---
        numpad_frame = tk.Frame(container, bg="#FFFFFF")
        numpad_frame.pack(padx=20, pady=10)

        buttons = [
            '1', '2', '3',
            '4', '5', '6',
            '7', '8', '9',
            'CLR', '0', 'OK'
        ]

        row, col = 0, 0
        for btn_text in buttons:
            btn_bg = "#F1F5F9" # Light gray for numbers
            btn_fg = "#1E293B"
            
            if btn_text == "OK":
                btn_bg = "#4338CA" # Indigo for OK
                btn_fg = "#FFFFFF"
            elif btn_text == "CLR":
                btn_bg = "#FEE2E2" # Light red for Clear
                btn_fg = "#991B1B"

            btn = tk.Button(numpad_frame, text=btn_text, font=("Arial", 16, "bold"),
                            width=6, height=2, bg=btn_bg, fg=btn_fg, relief="flat",
                            activebackground="#E2E8F0", bd=0,
                            command=lambda t=btn_text: self.on_button_click(t))
            btn.grid(row=row, column=col, padx=5, pady=5)
            
            col += 1
            if col > 2:
                col = 0
                row += 1

        # Back to Signature Button
        tk.Button(container, text="Cancel", font=("Arial", 10, "underline"), 
                  bg="#FFFFFF", fg="#64748B", bd=0, cursor="hand2",
                  command=lambda: controller.show_frame("SignaturePage")).pack(pady=20)

    def on_button_click(self, key):
        if key == "CLR":
            self.pin_code = ""
        elif key == "OK":
            self.verify_pin()
            return
        else:
            if len(self.pin_code) < 4:
                self.pin_code += key
        
        self.update_dots()

    def update_dots(self):
        """Update the visual display of entered PIN digits"""
        entered = len(self.pin_code)
        display = "● " * entered + "○ " * (4 - entered)
        self.dots_label.config(text=display.strip())

    def verify_pin(self):
        """Check if entered PIN is correct and proceed to Execution"""
        if self.pin_code == self.correct_pin:
            # Success! Reset for next time and move to Execution Page
            self.pin_code = ""
            self.update_dots()
            frame = self.controller.frames["ExecutionPage"]
            frame.start_simulation()  # Call method to start the simulation
            self.controller.show_frame("ExecutionPage")
        else:
            # Failed
            messagebox.showerror("Invalid PIN", "The PIN you entered is incorrect.")
            self.pin_code = ""
            self.update_dots()