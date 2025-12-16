This lecture covers the **General Purpose Timer**. This is one of the most important components in an embedded system because the CPU (the brain) cannot keep track of time accurately on its own while doing other work.

We will use the **"Kitchen Chef & The Assistant"** analogy.

*   **The CPU:** The Chef. Highly skilled, doing math, making decisions, chopping vegetables.
*   **The Timer:** A Kitchen Assistant with a stopwatch. The Assistant is not smart, but they are extremely precise at counting seconds.

---

### **Slide 1 & 2: Introduction**
**The Concept:** What is a timer and why do we need it?

*   **Free-run counter:** It just counts 0, 1, 2, 3... forever, or until we tell it to stop.
*   **Independent:** The Chef (CPU) says to the Assistant (Timer), "Start counting," and then the Chef goes back to chopping onions. The Timer runs *in parallel*.

**The 4 Main Jobs of the Assistant:**
1.  **Input Capture:** "Tell me exactly what time the doorbell rang."
2.  **Output Compare:** "Turn on the oven exactly when the counter hits 100."
3.  **PWM (Pulse Width Modulation):** "Flick the light switch on and off really fast to dim the lights."
4.  **One-pulse:** "Turn the light on for exactly 1 second, then stop."

---

### **Slide 3: The Heartbeat (Clock & Prescaler)**
**The Concept:** How fast does the timer count?

**The Intuition:**
*   **Clock ($f_{CL\_PSC}$):** This is the heartbeat of the chip. It’s super fast (e.g., 16 Million beats per second).
*   **Prescaler (PSC):** The Assistant cannot count that fast. The Prescaler is a **gear reduction** or a **turnstile**.
    *   Imagine a turnstile where 1 person enters for every 1 click. That is `PSC = 0`.
    *   Now imagine a turnstile that only clicks once after **1000 people** push through. That is the Prescaler. It slows down the count so it's manageable.
*   **ARR (Auto-Reload Register):** This is the **Max Count** or the **Finish Line**.
    *   The Assistant counts: 0, 1, 2 ... up to ARR.
    *   When he hits ARR, he resets to 0 and shouts "Done!" (Interrupt).

**Formula:** $f_{CNT} = \frac{\text{Input Clock}}{\text{Prescaler} + 1}$
*(We add +1 because computers count from 0).*

---

### **Slide 4: Output Compare (The Alarm Clock)**
**The Concept:** Controlling an output pin based on time.

**The Intuition:**
*   **The Counter (CNT):** The current time on the stopwatch.
*   **CCR (Capture & Compare Register):** This is the **Alarm Setting**.
*   **The Logic:**
    *   The Assistant watches the stopwatch (CNT).
    *   You set the Alarm (CCR) to "50".
    *   When the stopwatch hits "50", the Assistant instantly flips a switch (The Output Pin).
*   **Key difference:** **ARR** determines when the timer *resets* (End of day). **CCR** determines when the *action* happens (Lunch time).

---

### **Slide 5: Input Capture (The Photo Finish)**
**The Concept:** Measuring when an external event happens.

**The Intuition:**
*   You want to know exactly how long a button was pressed, or when a sensor signal arrived.
*   **The Process:**
    1.  The Stopwatch (Counter) is running continuously. 0, 1, 2, 3, 4, 5...
    2.  Suddenly, a runner crosses the finish line (External Signal comes in).
    3.  The Assistant instantly **snaps a picture** of the stopwatch.
    4.  He saves that number into the **CCR (Capture Register)**.
    5.  The Chef (CPU) can look at the CCR later to see exactly when it happened.

---

### **Slide 6 & 7: Multi-Channel & Output Modes**
**The Concept:** One timer can do multiple jobs.

*   **Slide 6:** A single Timer (One Assistant) can have 4 different Alarms (Channels 1-4).
    *   Alarm 1 turns on the Oven.
    *   Alarm 2 turns on the Blender.
    *   They all use the same main clock (Counter), but different trigger points (CCRs).
*   **Slide 7 (Output Modes):** What happens when the Alarm goes off?
    *   **Toggle:** If light is On, turn Off. If Off, turn On.
    *   **High/Low:** Force it On or Force it Off.

---

### **Slide 8 - 16: PWM (Pulse Width Modulation)**
This is the most popular use of timers (used for motor speed, LED brightness, Servos).

**The Intuition (The Dimmer Switch):**
*   If you turn a light ON and OFF really fast (1000 times a second), your eye doesn't see the flickering. It just sees the light as **dim**.
*   **Duty Cycle:** The percentage of time the switch is ON vs. OFF.
    *   50% Duty Cycle = Half brightness.
    *   10% Duty Cycle = Very dim.
    *   90% Duty Cycle = Very bright.

**How the Timer does it (Slide 12 is the best example):**
*   **ARR (The Period):** The total length of one cycle. (e.g., 10 ticks).
*   **CCR (The Threshold):** The "switch point." (e.g., 3 ticks).
*   **The Rule (PWM Mode 1):**
    *   Is the Counter < CCR? **Output High (ON)**.
    *   Is the Counter >= CCR? **Output Low (OFF)**.
*   **Visualizing Slide 12:**
    *   Counter goes 0, 1, 2 (Less than 3) -> **Pin is HIGH**.
    *   Counter goes 3, 4, 5, 6 (Greater than 3) -> **Pin is LOW**.
    *   Counter hits ARR (6), resets to 0 -> **Pin goes HIGH again**.

**Slide 9, 10, 11 (Counting Modes):**
*   **Edge-aligned (Up):** 0, 1, 2, 3, 4, 5, 6 -> Reset to 0. (Standard).
*   **Edge-aligned (Down):** 6, 5, 4, 3, 2, 1, 0 -> Reset to 6.
*   **Center-aligned:** 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0. (Like a pendulum). This is used for very smooth motor control to reduce electrical noise.

---

### **Slide 17 - 21: Input Capture Details**
**The Concept:** How do we measure pulses?

*   **Slide 17:** We can tell the timer to look for a **Rising Edge** (Voltage goes Low to High) or a **Falling Edge** (High to Low).
*   **Slide 20 (Filtering):** Real signals are noisy (bounce). The "Filter" is like a bouncer at a club. It says, "I need to see the signal stay high for 3 clock ticks before I believe it's real."
*   **Slide 21 (The Diagram):**
    *   Input Signal -> Filter (Clean noise) -> Edge Detector (Did it change?) -> **Trigger Capture** (Save the current count value to the CCR).

---

### **Slide 22 - 26: The Ultrasonic Sensor (HC-SR04)**
**The Real-World Example:** This connects everything we just learned.

**The Physics:**
1.  **Trigger:** You shout (send a sound pulse).
2.  **Echo:** You wait for the echo to bounce back.
3.  **Distance:** Speed of Sound $\times$ Time / 2.

**The Timer Process (Slide 23 & 25):**
1.  **Send Pulse:** The CPU tells the sensor "Go!" (Trigger pin).
2.  **Start Timer:** The Timer starts counting from 0.
3.  **Wait for Echo:** The sensor Output pin goes HIGH when the sound leaves, and stays HIGH until the echo returns.
4.  **Measure Width:** We need to measure **how long** that pin stayed HIGH.

**How to code this (The Intuition):**
*   We use **Input Capture**.
*   **Event A:** Detect Rising Edge (Sound started). Record the time (T1).
*   **Event B:** Detect Falling Edge (Sound returned). Record the time (T2).
*   **Calculation:** Pulse Width = T2 - T1.

**Slide 26 (The Overflow Problem):**
*   **The Scenario:** Imagine your stopwatch only goes up to 60 seconds.
*   **The Problem:** You shout into a huge canyon. The echo takes 70 seconds to come back.
*   **The Counter:** It counts to 60, resets to 0, and counts to 10.
*   **The Math:** If you just do $10 - 0$, you get 10 seconds. That's wrong!
*   **The Solution:** You need a variable in your code to count how many times the timer **Overflowed** (wrapped around).
*   **Total Time =** (Number of Overflows $\times$ Max Value) + Current Time.

---

### **Summary of the Mental Model**

1.  **Timer:** An automated assistant with a stopwatch.
2.  **Prescaler:** The gear that slows down the super-fast CPU clock to a tick-rate we can use.
3.  **ARR (Auto-Reload):** The limit of the stopwatch (The "Reset" point).
4.  **CCR (Capture/Compare):**
    *   **In Output Mode:** The "Alarm" time to flip a switch (make PWM).
    *   **In Input Mode:** The "Notepad" where we write down the time an event happened.
5.  **PWM:** Flicking a switch fast to control power. (Time < CCR = ON).
6.  **Ultrasonic Sensor:** Use Input Capture to measure how long the "Echo" signal stays High.