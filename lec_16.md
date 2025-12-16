### **Slide 1: Title Page**
*   **What it is:** Just the intro. We are learning how to control the "arms and legs" (GPIO) of the microcontroller.

---

### **Slide 2: How the CPU talks to the Hardware**
**The Concept:** Port-mapped vs. Memory-mapped I/O.

*   **The Intuition (The Mailbox):**
    Imagine you are the CPU (the brain). You are sitting in a room and you can only do one thing: **put letters into mailboxes**.
    *   **Port-mapped (Old school):** You have a special mailbox on your desk labeled "Lights." You need a special instruction to use it.
    *   **Memory-mapped (ARM Cortex - What we use):** You have a giant wall of numbered mailboxes (4 billion of them).
        *   Mailbox #100 is your RAM (variable storage).
        *   Mailbox #5000 is physically wired to a Light Bulb.
    *   **Key Takeaway:** To turn on a light, the CPU simply "writes a letter" (data) to Mailbox #5000. It treats the light bulb exactly the same as a variable in memory. This is why we use instructions like `STR` (Store) and `LDR` (Load).

---

### **Slides 3, 4, 5: The Map of the City**
**The Concept:** The Memory Map and Bus Architecture.

*   **The Intuition (The City Map):**
    *   **Slide 3 & 5:** This is the map of the "Mailbox City."
        *   **0x00... (Code):** The Library where your program instructions live.
        *   **0x20... (SRAM):** The Notepad where you do math calculations.
        *   **0x40... (Peripherals):** The Control Room. This is the neighborhood where the "switches" for LEDs, WiFi, and Buttons live.
    *   **Slide 4 (The Roads - AHB/APB):**
        *   **AHB (Advanced High-performance Bus):** This is the **Highway**. It connects the CPU to the Memory. It is super fast (Ferrari speed).
        *   **APB (Advanced Peripheral Bus):** This is the **Residential Street**. It connects to the "Control Room" (GPIO, Timers). It is slower (Bicycle speed).
        *   **The Bridge:** You can't drive a Ferrari at 200mph into a residential street. The "AHB to APB Bridge" slows the data down so it can safely talk to the LEDs.

---

### **Slide 6 & 7: The Physical Chip**
*   **The Intuition:**
    *   Look at the black square chip. It has metal legs (Pins).
    *   Inside the chip, these pins are grouped into teams called **Ports** (Team A, Team B, Team C...).
    *   Each Team (Port) has 16 Players (Pins 0 to 15).
    *   So, `PA5` means: **Port A (Team A), Pin 5 (Player 5).**

---

### **Slide 8, 9, 10: The Anatomy of a Pin (The Gatekeeper)**
**The Concept:** How a pin switches between listening (Input) and talking (Output).

*   **The Intuition (The Two-Way Window):**
    Imagine a window on the side of the chip.
    *   **Slide 9 (Output):** You want to shout out the window.
        *   You open the **Output Driver**.
        *   If you write `1`, you connect the pin to **VDD** (3.3 Volts). The pin becomes "Hot."
        *   If you write `0`, you connect the pin to **VSS** (Ground). The pin becomes "Cold."
    *   **Slide 10 (Input):** You want to listen to someone outside.
        *   You **disable** the Output Driver (shut your mouth).
        *   You enable the **Input Driver** (open your ears).
        *   Now you just measure: Is the pin Hot (3.3V) or Cold (0V)?
    *   **Why the "Schmitt Trigger"?** (The red box in Slide 10). We will explain this in Slide 15.

---

### **Slide 11 & 12: Output Mode - Push-Pull**
**The Concept:** The standard way to drive an LED.

*   **The Intuition (The Water Valves):**
    *   **Push (High / 1):** Imagine a water valve connected to a high tank. You open it, and water (current) flows OUT of the pin. This "Pushes" current to the LED to turn it on.
    *   **Pull (Low / 0):** Imagine a water valve connected to the drain. You open it, and it sucks any water on the line down to the drain. This "Pulls" the line to 0V.
    *   **Summary:** "Push-Pull" means the chip actively forces the pin to be High or actively forces it to be Low. It is strong in both directions.

---

### **Slide 13: Output Mode - Open-Drain**
**The Concept:** A weird mode used for special cases.

*   **The Intuition (The Emergency Brake):**
    *   In "Open-Drain," the top valve (the one that pushes High) is **removed**.
    *   **Logic 0:** You can pull the line to Ground (Brake ON). The pin is 0V.
    *   **Logic 1:** You just let go of the brake. But since there is no top valve, the pin doesn't go High. It just "floats." It's loose.
    *   **Why use this?** Imagine 5 people holding a rope. If everyone pulls down, the rope goes down. If everyone lets go, the rope floats. This allows multiple chips to share a wire without blowing each other up (like in I2C protocol). To make it go High, you need an external spring (Pull-up Resistor) to pull the rope up when everyone lets go.

---

### **Slide 14: Input - Pull-Up and Pull-Down**
**The Concept:** What is the "default" state of a button?

*   **The Intuition (The Balloon):**
    *   Imagine an Input Pin is a balloon in a room.
    *   **Floating (HiZ):** If you don't hold the balloon, it drifts around. Maybe it touches the ceiling (1), maybe the floor (0). This is bad. The CPU gets confused.
    *   **Pull-Up:** You tie the balloon to the ceiling with a rubber band. If no one touches it, it stays at the Ceiling (High/1). You have to pull it down hard to make it a 0.
    *   **Pull-Down:** You tie the balloon to the floor. If no one touches it, it stays at the Floor (Low/0). You have to lift it up hard to make it a 1.

---

### **Slide 15, 16, 17: The Schmitt Trigger**
**The Concept:** Cleaning up noisy signals.

*   **The Intuition (The Thermostat):**
    *   **Problem:** Real-world voltage isn't a perfect square. It wiggles. If the "Trip Point" is exactly 1.5V, and a noisy signal wiggles between 1.49V and 1.51V, the CPU thinks: "0... 1... 0... 1... 0...". The light would flicker insanely fast.
    *   **Solution (Schmitt Trigger):** This is a "Sticky Switch."
        *   To turn it **ON**, you must push it *past* 2.0V (High Threshold).
        *   To turn it **OFF**, you must drop it *below* 1.0V (Low Threshold).
        *   If the signal wiggles in the middle (1.5V), the switch **stays where it was**. It ignores the noise in the "Dead Zone."

---

### **Slide 18 - 22: The Registers (The Dashboard)**
**The Concept:** How we control this with C code.

*   **Slide 18:** Imagine the dashboard of a car. There isn't just one button. There is a cluster of buttons.
    *   **GPIO A** is one dashboard. It has 10 gauges/switches.
    *   Each gauge controls something different (Mode, Speed, Data).
    *   Each gauge is 32 bits (because the CPU is 32-bit).
*   **Slide 19:** We want to turn on Pin 14.
    *   We look for the **ODR** (Output Data Register) gauge.
    *   We find the 14th switch (bit) inside that gauge.
    *   We flip it to 1.
*   **Slide 21 & 22 (The Code):**
    *   `1UL << 14`: This is math that creates a "mask." It takes a `1` and moves it 14 spots to the left. `000...1...00`.
    *   `|=` (OR equals): This is the instruction "Keep all other switches exactly how they are, but force the 14th switch to ON."

---

### **Slide 23: The Hardware Setup**
*   **Context:** This slide just tells us where the Red LED is physically connected on the board.
*   It is connected to **Port B, Pin 2 (PB2)**.
*   This is important because in the code, we must talk to **GPIOB**, not GPIOA.

---

### **Slide 24 & 26: The Initialization Flowchart**
**The Concept:** The Checklist. You cannot just jump in the car and drive. You have a startup sequence.

**Step 1: The Clock (Slide 25)**
*   **Crucial Concept:** By default, the microcontroller turns off power to all Ports (A, B, C...) to save battery. The "Mailbox City" is in the dark.
*   **RCC_AHB2ENR:** This is the "Main Breaker Panel" for the house.
*   **Action:** You must flip the switch for "Port B" in the Breaker Panel (`RCC->AHB2ENR`). If you forget this, nothing else will work.

**Step 2: The Mode (Slide 27)**
*   **MODER Register:** This determines the personality of the pin.
*   Each pin gets 2 bits.
*   `00` = Input (Listening).
*   `01` = Output (Talking).
*   **Code:** We want the LED to light up, so we set Pin 2 to **01**.
    *   `&= ~(3UL<<4)`: This clears the bits (resets them to 00).
    *   `|= (1UL<<4)`: This sets the bits to 01. (Why 4? Because Pin 2 * 2 bits/pin = bit position 4).

**Step 3: The Output Type (Slide 29)**
*   **OTYPER Register:** Push-Pull or Open-Drain?
*   **Action:** For an LED, we want standard "Push-Pull" (0). We clear the bit to 0.

**Step 4: Pull-up/Pull-down (Slide 31)**
*   **PUPDR Register:** Do we need the rubber bands (resistors)?
*   **Action:** No. We are driving an LED. We don't need pull-ups. Set to `00`.

---

### **Slide 39 - 48: Keypad Scanning (The Matrix)**
**The Concept:** Reading 16 buttons using only 8 pins.

*   **The Intuition (The Hotel Floor Check):**
    Imagine a hotel with 4 Floors (Rows) and 4 Rooms on each floor (Columns). You are the security guard. You want to know if a guest is in a room.
*   **Setup:**
    *   **Rows (R1-R4):** Outputs. You control these.
    *   **Columns (C1-C3):** Inputs. You listen to these. The Columns are "Pulled Up" (connected to High/1 by default).
*   **The Check (Scanning):**
    *   **Slide 40 (Step 1):** The guard goes to **Floor 1**. He shouts "Is anyone here?" (He outputs a **0** / Low voltage to Row 1).
    *   He listens to the rooms (Columns).
        *   If Column 1 reads **1**: No connection. No one is pressing the button connecting Row 1 to Col 1.
        *   If Column 1 reads **0**: **AHA!** The button is pressed! The current flowed from the Column into the Row (because the Row is 0).
    *   **Slide 42 (Step 2):** If no one was on Floor 1, the guard disables Floor 1 and moves to **Floor 2**. He outputs a **0** to Row 2.
    *   He listens again.
*   **The Result:** By cycling through Rows 1, 2, 3, 4 really fast, we can find exactly which intersection (button) is pressed.

---

### **Slide 49: Debouncing**
**The Concept:** Physical reality vs. Digital speed.

*   **The Intuition (The Bouncing Ball):**
    *   When you push a button, inside the switch, two pieces of metal smack together.
    *   They don't stick perfectly instantly. They bounce. *Clang-clang-clang-click.*
    *   This takes about 5 to 20 milliseconds.
    *   **The Problem:** The CPU operates in nanoseconds. It sees that *Clang-clang-clang* as "Press, Release, Press, Release, Press." It thinks you clicked the button 5 times.
    *   **The Solution:** Software Debouncing.
        1.  CPU sees the first "Clang" (Press).
        2.  CPU says "Whoa, let's wait a moment."
        3.  CPU pauses (sleeps) for 20ms.
        4.  CPU looks again. Is it still pressed? Yes? Okay, now count it as **one** click.

---

### **Summary to remember the intuition:**
1.  **Memory Map:** Addresses = Mailboxes.
2.  **Clock Enable:** The Main Circuit Breaker (Turn it on first!).
3.  **GPIO Mode:** 00 (Listen), 01 (Talk).
4.  **ODR:** The actual value (1 or 0).
5.  **Keypad:** Check one row at a time (The Hotel Guard).
6.  **Debounce:** Wait for the metal to stop bouncing.