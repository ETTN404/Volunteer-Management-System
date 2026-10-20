# How check-in, check-out and hours work

Answers to the review questions (#5–#9, #14, #16, #23, #24).

## The QR code (Live shift page)
- **Who shows it?** The coordinator at the venue opens *Live shifts → shift* on a phone, tablet or
  laptop, or projects it with *Full screen*.
- **How do volunteers get it?** They don’t receive it anywhere. They open VolunTrack → *Check in*,
  share their location, and point the camera at the coordinator’s screen.
- **Why the timer?** The code changes every 30 seconds (org setting: 15/30/60/120 s) and a scan is
  accepted only for the current and previous code — about a minute. A photo forwarded to someone at
  home is useless almost immediately.
- **How it works:** the token is `VT1.{shift}.{window}.{HMAC}` signed with a per-shift secret that never
  leaves the server. The server recomputes the signature at check-in.

## What a self check-in must pass
1. Phone clock within 2 minutes of the server.
2. The volunteer is *confirmed* on that shift; the organization is active.
3. Inside the check-in window (default 15 min before → 30 min after start).
4. A live QR token (when the organization requires QR).
5. GPS inside the venue ring, and the reading precise enough (default ±150 m; weaker fixes are refused).

## Can someone cheat?
- *Fake GPS app:* possible on a rooted phone, so the **QR is the main proof** — it needs someone at the
  venue looking at the coordinator’s screen, and it expires within a minute.
- *Friend checks me in with my account on their phone:* the device id is recorded; one phone checking in
  several people is flagged **Same phone as another volunteer**.
- *Check in, leave, come back to check out:* while the app is open the phone confirms its location every
  5 minutes; pings outside the ring flag **Phone left the venue mid-shift**, few pings flag **Few location
  pings**, and checking out away from the venue is flagged too.
- *Final safeguard:* **no hour counts until a coordinator verifies it** (Verify hours shows every flag,
  scheduled vs. actual time, and offers verify / adjust / don’t count). Organizations can opt into
  auto-verifying only clean QR + GPS attendance.

## Check-out
- **Leaving early** (more than 15 min before the end): a reason is required, the coordinators get an alert,
  and the live page shows *Left early* with a **Fill the place** button that adds a free volunteer who
  already works with the organization (confirmed immediately and notified), or sends an urgent alert.
- **Checked out by mistake:** *Resume my shift* works for 10 minutes (while the shift is still running);
  after that the coordinator can check them back in.
- **Forgot to check out:** open check-ins close automatically at the **scheduled end** once 30 minutes have
  passed (marked *Auto checked out*; hours still need verification). This runs from busy endpoints because
  Render has no cron, and also via the scheduler when one exists.

## No phone, no data, no GPS
On the live roster, find the volunteer (name, email or phone), tick *I checked their ID* (or capture a
signature) → **Check in**. Check them out the same way. Both are recorded as *by staff* in the audit trail.

## Same account on several devices
Check-in, check-out and resume take a per-volunteer-per-shift lock and run in a database transaction, so two
phones (or a double tap) can’t create two check-ins; the second gets *You’re already checked in* and the app
switches to *Check out* immediately (the schedule now carries each shift’s attendance).
