# Volunteer Management System (VMS) - SaaS Graphical Frontend Master Plan & UX Spec

This document details the complete role-by-role, actor-by-actor frontend architecture, styles, layouts, and features for the Volunteer Management System (VMS). These specifications are designed to translate our high-security backend transactions into the beautiful, modern, high-contrast, responsive graphical user interfaces shown in the prototypes (**VolunTrack**, **Guardian Queue**, and **Neural Monitoring Command Center**).

---

## 🎨 1. Design Tokens, Colors, & Aesthetic Guidelines

To deliver a premium SaaS-level experience, the frontend will employ a hybrid design token system with two distinct color palettes (Light and Dark) that align perfectly with the shared mockups.

### 🍊 The Light Theme: VolunTrack & Guardian Queue
*   **Canvas Background:** Pure off-white/warm gray (`#FDFDFC` / `#F7F7F5`)
*   **Card Container Background:** Solid white (`#FFFFFF`) with thin, low-opacity gray borders (`#E3E3E0` / `#19140015`)
*   **Primary Accent Color:** High-contrast VolunTrack Orange (`#FF750F` / `#ED8936`)
*   **Secondary/Sidebar Accent:** Warm Slate Gray (`#706F6C` / `#2D3748`)
*   **Success Indicator:** Emerald Green (`#48BB78` / `#38A169`)
*   **Warning/Late Alerts:** Soft Red / Crimson (`#E53E3E` / `#C53030`)
*   **Action Highlights:** Amber (`#D69E2E`) and Violet (`#805AD5`)

### 🌌 The Dark Theme: Neural Monitoring & Admin Command Center
*   **Canvas Background:** Deep Space Slate (`#1A202C` / `#111827`)
*   **Card Container Background:** Terminal Matte Slate (`#2D3748` / `#1F2937`)
*   **Primary Accent Color:** Neon Emerald (`#10B981`) for healthy telemetry and active syncs
*   **Secondary Accent:** Deep Coral (`#F56565`) for alerts and hallucination warnings
*   **Text contrast:** Off-white (`#EDEDEC`) and silver (`#A1A09A`)

---

## 👥 2. Actor-By-Actor Frontend Architecture

### 🛡️ Actor 1: The Volunteer (The Mobile-Responsive Self-Service Portal)
The volunteer dashboard is fully responsive and optimized for mobile screens, giving volunteers complete control over their profiles, schedules, check-ins, and conversational AI assistance.

```
+-------------------------------------------------------+
|  [V] VolunTrack           [ Sarah Jenkins (12.5h) v ] |
+-------------------------------------------------------+
|  [ Browse Events ]   [ My Schedule ]   [ Ask VolunBot]|
+-------------------------------------------------------+
|                                                       |
|   Active Canvas Section (Renders Selected Page):      |
|                                                       |
|   +-----------------------------------------------+   |
|   | EVENT CARD: Disaster Response Drill           |   |
|   | Date: June 15 - June 20   Location: Stadium   |   |
|   | Required Skills: First Aid                    |   |
|   | Match Score: [||||||||||||||||||] 100.00%     |   |
|   | [ Apply to Shift ]                            |   |
|   +-----------------------------------------------+   |
|                                                       |
+-------------------------------------------------------+
```

#### Page 1.1: Personal Metrics Landing Page
*   **Stats Cards Widgets:**
    *   *Total Hours Served:* Showing decimal hours (e.g. `12.50 hours`) inside a clean card.
    *   *Impact Score:* Showing points (e.g. `4.80 / 10.00`) with a small tooltip explaining how scores increase by 0.1 points per hour.
    *   *Registered Skills List:* Horizontal row of skill tags (e.g., `[First Aid]` `[Disaster Response]`).
    *   *Announcements Bullet Board:* Sleek list of urgent announcements posted by coordinators.

#### Page 1.2: Interactive Event Browser (`/volunteer/events`)
*   **Filter Panel:** Dropdown sorting events by date, location, and match score compatibility.
*   **Visual Event Cards:**
    *   *Compatibility Badge:* Shows the dynamically calculated Match Score percentage in high-contrast (e.g., `100.00% Match` in green background, or `50.00% Match` in gray background).
    *   *Overlapping Overlap Alerts:* If a shift's timing overlaps with an already pending or confirmed shift in the volunteer's schedule, an orange warning banner overlays the card: `⚠️ Timing Conflict: Overlaps with an active assignment!`.
    *   *Interactive Apply Button:* Triggers a state transition, turning into a spinner, and then updating to a `Pending Coordinator Review` disabled badge.

#### Page 1.3: Timeline Schedule Calendar (`/volunteer/schedule`)
*   **Visual Timeline List:** Chronological timeline showing scheduled events.
*   **Timing status pills:**
    *   `Confirmed` (Green outline with a checkmark).
    *   `Pending` (Gray outline with a waiting clock).
    *   `Cancelled` (Red strikethrough).
*   **Active Shift Actions:** If the shift start time is active (within +/- 15 min check-in window), a prominent **Check-In Now** orange button pulses next to the timeline item, launching the scanner.

#### Page 1.4: Real-Time GPS / QR Check-In Scanner Panel
*   **HTML5/JS Camera Modal:** Accesses the mobile device camera to scan the dynamic, signed QR code.
*   **Browser Geolocation Capture:** Seamlessly captures `latitude` and `longitude` in the background.
*   **Interactive Geofence Error Screen:** If the geolocation is outside the allowed 100m geofence, the scanner fades and renders a location-warning screen:
    *   A bold red warning: `📍 Location Boundary Blocked`.
    *   Shows a calculated distance metric: `You are currently 5.4 kilometers away from Addis Ababa Stadium. Check-in is restricted to 100 meters.`
    *   Option to contact coordinator for manual check-in override.

#### Page 1.5: VolunBot AI Chat Drawer (`/volunteer/chat`)
*   **Immersive Chat Interface:** Fully styled conversation box with separate left-aligned chatbot bubbles (grey background, orange bot icon) and right-aligned user bubbles (orange background, user icon).
*   **Typewriter typing indicator:** A pulsing `... VolunBot is typing...` dot indicator showing the bot compiling context.
*   **Clickable Context Prompts:** Quick-click tags at the bottom to trigger pre-configured contextual queries (e.g., `When is my next shift?` or `How many hours do I need for my next certificate?`).

---

### 📋 Actor 2: The Volunteer Coordinator (The Operations control desk)
The coordinator desk houses the flagship administrative portals: the screening panel (**Guardian Queue**) and the real-time check-in controller (**VolunTrack**).

#### Page 2.1: "Guardian Queue" Applicant Screening Desk (`/coordinator/applications`)
Translates the intricate layout of **Image 3** into a fully responsive, stateful 3-pane dashboard:

```
+-----------------------------------------------------------------------------------+
|  [ Review Queue: 74 Pending ]  |  Sarah Jenkins (Registered Nurse) 94% Match  | S |
|  ----------------------------  |  ------------------------------------------  | t |
|  [ Sarah Jenkins ]  94% Match  |  SKILLS ALIGNMENT RADAR CHART:               | a |
|  [ Marcus Chen   ]  82% Match  |        Logistics                             | f |
|  [ Elena Rodriguez] 65% Match  |           /\                                 | f |
|                                | Leadership/ \ Medical (95%)                  |   |
|                                |          \  /                                | N |
|                                |           \/                                 | o |
|                                |      Heavy Lifting                           | t |
|                                |  ------------------------------------------  | e |
|                                |  AI FEEDBACK SUGGESTER:                      | s |
|                                |  "Hi Sarah, we need an updated CPR cert..."  |   |
|                                |  ------------------------------------------  | v |
|                                |  [ Decline ] [ Waitlist ] [=== Slide Approve]    |
+-----------------------------------------------------------------------------------+
```

*   **Pane A: Left Review Queue List Card**
    *   A scrollable vertical list of candidate cards containing name, credentials summary, and a circular match-score percentage pill.
*   **Pane B: Middle Candidate File details (Sarah Jenkins)**
    *   *Visual Radar Chart:* An HTML-SVG Radar/Spider Chart compiled dynamically based on the volunteer's skillset (Medical, Logistics, Crisis Management, Heavy Lifting, Leadership).
    *   *Reliability History widgets:* Two progress bars representing the volunteer's live calculated *Attendance Rate* (98%) and *On-Time punctuality* (95%), coupled with metrics cards for Shifts Completed and Hours.
    *   *Document Previewer Frame:* A formatted mock browser container previewing uploaded qualifications (e.g., `Medical_License_WA.pdf` with signature stamp).
    *   *AI-Drafted Feedback Card:* A textarea card displaying pre-compiled constructive feedback for missing criteria with an edit button.
    *   *Slider-To-Approve Action control:* A custom Alpine.js-powered **Slide to Approve** slider bar. Sliding it right fires an API request, plays a green success checkmark animation, and transitions the status to confirmed.
*   **Pane C: Right Staff Context Notes Chat**
    *   An internal discussion thread linked to the applicant's record. Coordinators can type inside a text box and append internal logs (e.g. *"Abebe: Validated her medical license, looks great. Approved."*).

#### Page 2.2: "VolunTrack" Live Attendance Desk (`/coordinator/attendance`)
Translates the detailed grid layout of **Image 2** into a live, interactive check-in console:
*   **SaaS Daily metrics Bar:** Real-time counter widgets displaying:
    *   `Total Expected: 145` (Gray badge)
    *   `On-Site: 82` (Green badge)
    *   `Pending: 58` (Amber badge)
    *   `Late: 5` (Red badge)
*   **Attendance Queue Grid:** Rows of scheduled volunteers with color-coded status pills:
    *   `On-Site` (Green badge with checkmark and check-in timestamp).
    *   `Pending` (Gray badge with waiting clock).
    *   `Late (25m) / Flagged` (Red badge with hazard icon).
*   **Interactive Manual Check-In Override modal:**
    *   Launches when clicking `Force Check-In` for a volunteer.
    *   Features an **Alpine.js Canvas Drawing Pad** where the volunteer can draw their signature manually using a stylus or finger.
    *   Includes a `Clear Pad` button and a primary dark-blue `Force Check-In` button to upload the signature as base64 data, verifying attendance.

#### Page 2.3: Urgent Shift coverage Broadcast Control Panel
*   **Broadcaster Form:** Select an active shift, automatically displaying the shift's `required_skills` and counting matching qualified volunteers inside the database.
*   **Alert Builder Card:** Text area to compose the message, featuring a primary red broadcast trigger button: `🚨 Broadcast Coverage Alert`.
*   **Notification Dispatch Logs:** Dynamic log feed showing simulated SMS/Email deliveries to matching volunteers.

---

### 🏢 Actor 3: The Organization Admin (The Tenant Administration Console)
The Organization Admin manages internal organizational workflows, branding settings, metrics, and staff credentials.

#### Page 3.1: Consolidated Analytics Dashboard
*   **Metrics Summary widgets:** Displays organization-wide total hours logged, average matching percentages, and active events.
*   **Visual Chart Card:** An interactive bar chart or line graph tracking hours served month-by-month.

#### Page 3.2: Staff Management Portal (`/coordinator/staff`)
*   **Staff Registry Board:** A table listing all Volunteer Coordinators belonging to the organization.
*   **Action triggers:** Add new coordinators, edit permissions, or click `Deactivate Account` (which immediately deauthorizes their Sanctum session tokens).

#### Page 3.3: Analytical Reports Center (`/coordinator/reports`)
*   **Report Compiler form:** Choose a periodical range (e.g. `Q1 2026`) and click `Compile Report`.
*   **Download Cabinet Table:** Chronological table listing compiled CSV reports with columns for generated date, total hours aggregated, total volunteers active, and an action button to download the physical CSV file.

#### Page 3.4: Branding & Workspace Configurator (`/coordinator/settings`)
*   **Settings Form:** Upload organization logo, configure custom branding primary colors, physical address, and define hours milestone thresholds (e.g., issuing certificates at 20h, 50h, 100h).

---

### 🧠 Actor 4: The General System Admin (The SaaS Command Center)
The SuperAdmin console employs a high-contrast dark theme (Image 1) to supervise overall platform health and onboard new organization tenants.

```
+-------------------------------------------------------+
|  NEURAL MONITORING COMMAND CENTER                     |
+-------------------------------------------------------+
|  API Health: [Healthy]  |  Token Budget: [|||||| ]    |
+-------------------------------------------------------+
|  TENANT ONBOARDING FORM:                              |
|  Org Name: [                 ]  Org Email: [         ] |
|  Admin Name: [               ]  Admin Email: [       ] |
|  [ Onboard New Tenant Organization Workspace ]        |
+-------------------------------------------------------+
```

#### Page 4.1: Tenant Onboarding Hub (`/superadmin/onboard`)
*   **Atomic Onboarding Form:** Double-sided form. Left side captures Organization configurations; right side captures details for the designated Org Admin account.
*   **Trigger Button:** Primary purple action button to onboard and instantiate the database partition.

#### Page 4.2: Platform Telemetry Monitor (`/superadmin/monitoring`)
*   **Telemetry status cards:** Displays overall platform stats, Gemini API healthy status indicators, chatbot response latencies (e.g. `1.2s`), and token budget progress bars.
*   **Live Query Log Feed:** A real-time stream logging chatbot prompts, response histories, and context filters.

---

## 📈 3. Implementation Steps & Checklist

This section maps directly to Phase 7 of our roadmap. We will execute these tasks sequentially:

*   [ ] **Task 3.1:** Draft and build HTML layouts for the 3-column welcome blade canvas.
*   [ ] **Task 3.2:** Develop JavaScript core loaders to fetch data from `/api` using stored tokens and update UI badges.
*   [ ] **Task 3.3:** Implement `renderEvents()` to dynamically render gorgeous visual event cards with skill match score progress bars.
*   [ ] **Task 3.4:** Implement `renderSchedule()` to display sleek vertical timelines with chronological status pills.
*   [ ] **Task 3.5:** Implement `renderChatbot()` to output conversational chat bubbles with typewriter animations.
*   [ ] **Task 3.6:** Implement `renderAiScreening()` to render the full master-detail **Guardian Queue Applicant Screening panel** (Radar alignment dimensions, profile card, AI text, slide slider).
*   [ ] **Task 3.7:** Implement `renderReports()` to display VolunTrack expected statistics counters, CSV compilations, and signature capture override pads.
*   [ ] **Task 3.8:** Perform rigorous end-to-end frontend interface verifications, ensuring seamless responsiveness across all actors and roles.

*Drafted on: June 11, 2026*
*Author: Lead UI/UX Architect*
