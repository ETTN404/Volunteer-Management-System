import { http } from 'msw';
import { db, find, nowIso } from '../../db';
import { api, authed, body, json, validate } from '../utils';
import { CERTIFICATE_MILESTONES } from '@/shared/lib/skills';

const ETHIOPIC = /[ሀ-፿]/;

/** Context-aware stand-in for GeminiService — answers from the same context the Laravel controller builds. */
function reply(message: string, volunteerId: number): string {
  const v = find.volunteer(volunteerId)!;
  const user = find.user(v.user_id)!;
  const first = user.full_name.split(' ')[0];
  const amharic = ETHIOPIC.test(message);
  const lower = message.toLowerCase();

  const upcoming = db.t.assignments
    .filter((a) => a.volunteer_id === v.id && a.status === 'confirmed')
    .map((a) => ({ a, s: find.shift(a.shift_id)! }))
    .filter(({ s }) => new Date(s.end_time) > new Date())
    .sort((x, y) => x.s.start_time.localeCompare(y.s.start_time));
  const next = upcoming[0];
  const nextEvent = next ? find.event(next.s.event_id) : undefined;
  const when = next ? new Date(next.s.start_time).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const milestone = CERTIFICATE_MILESTONES.find((m) => m > v.total_hours);
  const toGo = milestone ? Math.round((milestone - v.total_hours) * 10) / 10 : 0;

  if (amharic) {
    if (/ፈረቃ|መቼ|ቀጣይ/.test(message) && next && nextEvent) {
      return `ሰላም ${first}! ቀጣዩ ፈረቃዎ "${nextEvent.title}" ነው — ${when}፣ ${nextEvent.location}። ከቦታው በ${nextEvent.geofence_radius} ሜትር ውስጥ ሆነው QR ኮዱን ይቃኙ።`;
    }
    if (/ሰዓት|ሰርተፊኬት/.test(message)) {
      return `እስካሁን ${v.total_hours} የተረጋገጡ ሰዓቶች አሉዎት።${milestone ? ` የ${milestone}-ሰዓት ሰርተፊኬት ለማግኘት ${toGo} ሰዓት ብቻ ይቀርዎታል።` : ''} በርቱ!`;
    }
    return `ሰላም ${first}! ስለ ፈረቃዎ፣ ሰዓቶችዎ፣ ሰርተፊኬቶችዎ ወይም የተጽዕኖ ውጤትዎ (${v.impact_score}) ይጠይቁኝ።`;
  }

  if (/(next|upcoming|when).*(shift)|my shift|schedule/.test(lower)) {
    return next && nextEvent
      ? `Your next confirmed shift is **${nextEvent.title}** — ${when} at ${nextEvent.location}. Check in from within ${nextEvent.geofence_radius} m of the venue by scanning your coordinator's QR code. ${upcoming.length > 1 ? `After that you have ${upcoming.length - 1} more confirmed.` : ''}`
      : `You have no confirmed shifts coming up. Open **Opportunities** — shifts that match your skills (${v.skills.join(', ').replace(/_/g, ' ')}) are listed first.`;
  }
  if (/certif|milestone|hours/.test(lower)) {
    return milestone
      ? `You have **${v.total_hours} verified hours**. Your next certificate unlocks at **${milestone} hours** — ${toGo} hours to go. That is about ${Math.ceil(toGo / 4)} more four-hour shifts.`
      : `You have **${v.total_hours} verified hours** and every milestone certificate up to 500 hours. Remarkable.`;
  }
  if (/impact|score/.test(lower)) {
    return `Your impact score is **${v.impact_score} / 100**. Each verified hour earns 0.1 points, multiplied by bonuses: +20% for shifts needing 3+ skills, +15% when you check in on time, and +10% while your attendance rate stays at 90% or above.`;
  }
  if (/check.?in|qr|gps|location/.test(lower)) {
    return `Check-in opens 15 minutes before your shift and closes 30 minutes after it starts. Allow location access, stand within the venue's geofence, and scan the QR code your coordinator shows. If your phone can't get a GPS fix, ask your coordinator for a manual check-in.`;
  }
  return `Hi ${first}! I can help with your schedule, hours, certificates and impact score. Try “When is my next shift?” — or ask in Amharic.`;
}

export const chatHandlers = [
  http.post(
    api('/volunteer/chat'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, { message: { required: true, type: 'string', max: 1000 } });
      if (invalid) return invalid;
      const v = actor.volunteer!;
      const text = reply(String(b.message), v.id);
      const history = (db.t.chat[v.id] ??= []);
      history.push({ role: 'user', text: String(b.message), at: nowIso() }, { role: 'model', text, at: nowIso() });
      if (history.length > 20) db.t.chat[v.id] = history.slice(-20);
      return json({ status: 'success', bot_name: 'VolunBot AI', query: b.message, response: text, timestamp: nowIso() });
    }),
  ),
];
