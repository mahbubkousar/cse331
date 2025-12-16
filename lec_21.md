This lecture is a "two-in-one" special. It covers **DMA** (Direct Memory Access) and **UART** (Serial Communication).

We will combine these two into a single story: **"The Boss, The Movers, and The Telegraph."**

---

### **Part 1: DMA (Direct Memory Access)**
**(Slides 1–21)**

**The Concept:**
Imagine you are the CEO of a company (the CPU). You need to move 1,000 boxes of files from the Loading Dock (Peripheral) to the Archive Room (Memory).
*   **Without DMA:** You, the CEO, take off your suit, go to the dock, pick up **one** box, walk to the archive, put it down. Repeat 1,000 times. You cannot do any CEO work (math, logic, decision making) while doing this manual labor.
*   **With DMA:** You hire a **Moving Company (DMA Controller)**. You tell them: "Move 1,000 boxes from Dock A to Room B." Then you go back to your office to do CEO work. When they are done, they knock on your door (Interrupt).

---

### **Slides 2 - 5: The Problem vs. The Solution**
*   **Slides 2 & 3 (The Manual Way):**
    *   To move data, the CPU has to use `LDR` (Load) to pick it up into a register, and `STR` (Store) to put it down.
    *   This occupies the CPU completely. It's a waste of brainpower.
*   **Slides 4 & 5 (The DMA Way):**
    *   Notice the red line creates a shortcut.
    *   The data flows directly from the Peripheral to Memory (or vice versa). The CPU is **not** touching the data. It is free to calculate other things.

### **Slide 6: Bus Matrix (The Traffic Cop)**
*   **The Intuition:**
    *   The CPU and the DMA both need to use the "roads" (System Bus) to access memory.
    *   They can't drive on the same road at the exact same time. The **Bus Matrix** is the traffic cop that says "Okay DMA, you go," then "Okay CPU, you go."
    *   Even though they share the road, it is still much faster than the CPU doing the lifting itself.

### **Slide 7: Channels (The Teams)**
*   **The Intuition:**
    *   The DMA Controller isn't just one guy; it's a company with different **Teams (Channels)**.
    *   **Channel 1** might be specialized for the ADC (Analog sensor).
    *   **Channel 2** might be specialized for SPI (Screen).
    *   **The Map:** This slide is just a lookup table. If you want to use UART3_TX, you *must* use Channel 2. You can't just pick any random channel.

### **Slide 10: The Contract (Registers)**
**The Concept:** How do you give instructions to the Movers? You fill out a form (Registers).

1.  **CPAR (Peripheral Address):** "Where do I pick up the boxes?" (e.g., The UART Data Register address).
2.  **CMAR (Memory Address):** "Where do I put them?" (e.g., The address of your array `buffer[]`).
3.  **CNDTR (Number of Data):** "How many boxes?" (e.g., 100 bytes).
4.  **CCR (Configuration):** "How do I carry them?" (Byte by byte? Word by word? High priority?).

### **Slides 11 - 13: Incremental Mode**
**The Concept:**
*   **Peripheral (Non-incremental):** The Loading Dock is always in the same place. You always pick up from the *same* address.
*   **Memory (Incremental):** The Archive Room has shelves.
    *   Put box 1 on Shelf 1.
    *   Put box 2 on Shelf 2 (Increment address).
    *   Put box 3 on Shelf 3 (Increment address).
*   **Slide 13:** When `CNDTR` (Counter) reaches 0, the DMA stops. The job is done.

### **Slide 14: Circular Mode (The Sushi Conveyor Belt)**
**The Concept:** What if the data never stops coming? (Like audio or a continuous sensor).
*   **The Intuition:**
    *   Imagine a circular buffer.
    *   The DMA fills slot 1, 2, 3... 10.
    *   Instead of stopping at 10, it wraps around and overwrites slot 1.
    *   **Use Case:** Ideal for listening to a continuous stream of data where you always want the "latest" chunk.

### **Slide 18: Handshaking (Request & Acknowledge)**
*   **The Intuition:** The Movers (DMA) are fast, but the Dock (Peripheral) might be slow.
*   **The Protocol:**
    1.  **Request:** The UART says, "Hey DMA, I just received a byte! Come get it!"
    2.  **Transfer:** The DMA grabs it.
    3.  **Acknowledge:** The DMA says, "Got it, thanks."

---

### **Part 2: UART (Serial Communication)**
**(Slides 22–35)**

**The Concept:**
How do two chips talk to each other using only 2 wires?
This is **The Telegraph**.

### **Slide 23: The Connection**
*   **Universal Asynchronous Receiver Transmitter:** A fancy name for "Talking without a shared clock."
*   **The Wiring:**
    *   My Mouth (TX) connects to your Ear (RX).
    *   My Ear (RX) connects to your Mouth (TX).
    *   **Crucial:** You must cross the wires (TX to RX). If you connect TX to TX, you are shouting into someone else's mouth.

### **Slide 27: The Data Frame (The Envelope)**
**The Concept:** Since there is no clock wire to say "Read Now," we need a strict format.

*   **Idle:** The line stays High (1) when silent.
*   **Start Bit (Low):** The sender pulls the line Low (0). This shouts "WAKE UP! Data is coming!"
*   **Data Bits:** Usually 8 bits (1 byte).
*   **Parity Bit:** A safety check (Did I send an even number of 1s?).
*   **Stop Bit (High):** The sender pulls the line High (1). This says "End of message."

### **Slide 28: Baud Rate (The Speed of Speech)**
*   **The Concept:** Both sides must agree on the speed *before* they start talking.
*   **9600 Baud:** I am speaking at a rate of 9600 bits per second.
*   **The Risk:** If I speak at 9600 and you listen at 115200, you will hear garbage.

### **Slide 29: Parity (The Spell Check)**
*   **Even Parity:** "I promise that the total number of 1s in my message (including the parity bit) will always be an even number."
*   **The Check:** If the receiver counts an *odd* number of 1s, it knows the message was corrupted by noise.

### **Slide 32 & 33: Receiving with Interrupts (The Old Way)**
*   **Scenario:** You want to receive a sentence "HELLO".
*   **Slide 32:**
    1.  'H' arrives.
    2.  **Interrupt triggers!** CPU stops working, jumps to ISR, saves 'H' to variable, returns.
    3.  'E' arrives.
    4.  **Interrupt triggers!** CPU stops working, jumps to ISR...
*   **Problem:** If you receive fast data, the CPU is constantly being interrupted. It's annoying.

### **Slide 34 & 35: The Grand Finale (UART + DMA)**
**The Concept:** Combining the Movers with the Telegraph.

*   **The Workflow (Slide 34):**
    1.  **Setup:** The CPU tells the DMA: "Listen to the UART. Whenever a byte comes in, put it into this huge array called `Rx_Buffer`. Wake me up only when you have collected 100 bytes."
    2.  **The Action:**
        *   Byte arrives at UART -> UART sends **Hardware Request** to DMA.
        *   DMA wakes up, grabs the byte, puts it in memory, increments the address.
        *   CPU is *completely unaware* this is happening. CPU is happily doing math.
    3.  **Completion:**
        *   When the 100th byte arrives, the DMA triggers a **Completion Interrupt**.
        *   CPU wakes up: "Oh, the message is ready? Great, I'll read the whole buffer now."

### **Summary of the Mental Model**

1.  **DMA:** Professional movers. They copy data so the CPU doesn't have to.
2.  **Registers (CPAR/CMAR/CNDTR):** Source, Destination, Amount.
3.  **UART:** Talking via telegraph (TX/RX) without a clock.
4.  **Baud Rate:** The agreed speed of blinking/talking.
5.  **UART + DMA:** The UART acts as the sensor, triggering the DMA to file the data away automatically. The CPU only gets involved when the whole message is received.