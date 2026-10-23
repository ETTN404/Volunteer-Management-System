import { http } from 'msw';
import { db, find, nowIso } from '../../db';
import { api, authed, body, json, validate } from '../utils';
import { CERTIFICATE_MILESTONES, matchScore } from '@/shared/lib/skills';
import { distanceMeters } from '@/shared/lib/geo';
import type { ChatShiftCard } from '@/shared/types/api';
import type { ChatTurn } from '../../db/schema';

const ETHIOPIC = /[ሀ-፿]/;

type Loc = { latitude: number; longitude: number; label?: string | null; source: string };
const locations: Record<number, Loc | undefined> = {};

type Thread = { id: string; title: string; created_at: string; updated_at: string; turns: ChatTurn[] };
const threads: Record<number, Thread[]> = {};
let seq = 0;
const listOf = (volunteerId: number) => (threads[volunteerId] ??= []);
export const clearMockThreads = (volunteerId: number) => {
  threads[volunteerId] = [];
};

function card(shiftId: number, loc: Loc | undefined, skills: string[], status?: ChatShiftCard['my_status']): ChatShiftCard | null {
  const s = find.shift(shiftId);
  const e = s && find.event(s.event_id);
  if (!s || !e) return null;
  const org = find.org(e.org_id);
  const confirmed = db.t.assignments.filter((a) => a.shift_id === s.id && a.status === 'confirmed').length;
  const km = loc && e.latitude != null && e.longitude != null ? distanceMeters(loc, { latitude: e.latitude, longitude: e.longitude }) / 1000 : undefined;
  return {
    shift_id: s.id,
    event_id: e.id,
    event_title: e.title,
    organization: org?.name,
    org_color: org?.primary_color,
    start_time: s.start_time,
    end_time: s.end_time,
    location: e.location,
    latitude: e.latitude ?? undefined,
    longitude: e.longitude ?? undefined,
    distance_km: km != null ? Math.round(km * 10) / 10 : undefined,
    capacity: s.capacity,
    confirmed,
    match: status ? undefined : matchScore(skills, s.required_skills),
    reasons: status ? undefined : [s.required_skills.length ? 'matches your skills' : 'no special skills needed', ...(km != null ? [`${km.toFixed(1)} km from you`] : [])],
    my_status: status ?? null,
  };
}

/** Context-aware stand-in for the Laravel VolunBot — answers only from mock data. */
function reply(message: string, volunteerId: number) {
  const v = find.volunteer(volunteerId)!;
  const user = find.user(v.user_id)!;
  const first = user.full_name.split(' ')[0];
  const amharic = ETHIOPIC.test(message);
  const lower = message.toLowerCase();
  const loc = locations[volunteerId];

  const mine = db.t.assignments.filter((a) => a.volunteer_id === v.id && ['confirmed', 'pending', 'waitlisted'].includes(a.status));
  const upcoming = mine
    .map((a) => ({ a, s: find.shift(a.shift_id)! }))
    .filter(({ s }) => s && new Date(s.end_time) > new Date())
    .sort((x, y) => x.s.start_time.localeCompare(y.s.start_time));
  const next = upcoming[0];
  const nextEvent = next ? find.event(next.s.event_id) : undefined;
  const when = next ? new Date(next.s.start_time).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const milestone = CERTIFICATE_MILESTONES.find((m) => m > v.total_hours);
  const toGo = milestone ? Math.round((milestone - v.total_hours) * 10) / 10 : 0;
  const taken = new Set(db.t.assignments.filter((a) => a.volunteer_id === v.id).map((a) => a.shift_id));
  const open = db.t.shifts
    .filter((s) => new Date(s.start_time) > new Date() && !taken.has(s.id))
    .map((s) => card(s.id, loc, v.skills))
    .filter((c): c is ChatShiftCard => Boolean(c))
    .sort((a, b) => (b.match ?? 0) - (a.match ?? 0) + ((a.distance_km ?? 0) - (b.distance_km ?? 0)) * 0.5);
  const mineCards = upcoming.slice(0, 3).map(({ a }) => card(a.shift_id, loc, v.skills, a.status as ChatShiftCard['my_status'])).filter((c): c is ChatShiftCard => Boolean(c));

  const out = (response: string, cards: ChatShiftCard[] = [], follow_ups: string[] = [], ask_location = false) => ({ response, cards, follow_ups, ask_location });

  if (amharic) {
    if (/ሺፍት|ፈረቃ|መቼ|ቀጣይ/.test(message) && next && nextEvent) {
      return out(`ሰላም ${first}! ቀጣዩ ሺፍትዎ **${nextEvent.title}** ነው — ${when}፣ ${nextEvent.location}። ከቦታው በ${nextEvent.geofence_radius} ሜትር ውስጥ ሆነው QR ኮዱን ይቃኙ።`, mineCards.slice(0, 1), ['ከእኔ ምን ያህል ይርቃል?', 'ቼክ-ኢን እንዴት ነው?']);
    }
    if (/ሰዓት|ሰርተፊኬት/.test(message)) {
      return out(`እስካሁን **${v.total_hours} የተረጋገጡ ሰዓቶች** አሉዎት።${milestone ? ` የ${milestone}-ሰዓት ሰርተፊኬት ለማግኘት ${toGo} ሰዓት ብቻ ይቀርዎታል።` : ''} በርቱ!`, [], ['ለእኔ የሚስማሙ ዕድሎችን ጠቁመኝ']);
    }
    return out(`ሰላም ${first}! ስለ ሺፍቶችዎ፣ ሰዓቶችዎ፣ ሰርተፊኬቶችዎ ወይም ለእርስዎ የሚስማሙ ዕድሎች ይጠይቁኝ።`, [], ['ቀጣይ ሺፍቴ መቼ ነው?', 'ለእኔ የሚስማሙ ዕድሎችን ጠቁመኝ']);
  }

  if (/far|distance|near|km/.test(lower)) {
    if (!loc) return out(`To measure distances I need to know where you are, ${first}. Share your location below — I'll only use it for this chat.`, [], [], true);
    const near = [...open].filter((c) => c.distance_km != null).sort((a, b) => a.distance_km! - b.distance_km!).slice(0, 3);
    const nextCard = mineCards[0];
    return out(
      `${nextCard?.distance_km != null ? `Your next shift, **${nextCard.event_title}**, is **${nextCard.distance_km} km** away — about ${Math.max(5, Math.round((nextCard.distance_km * 1.3) / 22 * 60))} min by taxi. ` : ''}The closest open shifts to you are below.`,
      [...(nextCard ? [nextCard] : []), ...near].slice(0, 4),
      ['Which one fits my skills best?', 'What should I bring?'],
    );
  }
  if (/(best|recommend|suggest|opportunit|match)/.test(lower)) {
    const top = open.slice(0, 3);
    return out(
      top.length
        ? `Here are your best matches right now, ${first}. **${top[0]!.event_title}** is the strongest fit${top[0]!.distance_km != null ? ` and only ${top[0]!.distance_km} km away` : ''}.${loc ? '' : ' Share your location and I can rank them by distance too.'}`
        : 'There are no open shifts right now — new ones appear often, so check back soon.',
      top,
      ['How far is the first one from me?', 'Do any fit my weekend availability?'],
      !loc,
    );
  }
  if (/(next|upcoming|when).*(shift)|my shift|schedule/.test(lower)) {
    return next && nextEvent
      ? out(`Your next shift is **${nextEvent.title}** — ${when} at ${nextEvent.location}. Check in from within ${nextEvent.geofence_radius} m of the venue by scanning your coordinator's QR code.${upcoming.length > 1 ? ` After that you have ${upcoming.length - 1} more.` : ''}`, mineCards, ['How far is it from me?', 'What should I bring?'])
      : out(`You have no shifts coming up. These suit your skills (${v.skills.join(', ').replace(/_/g, ' ')}):`, open.slice(0, 3), ['Show me weekend shifts']);
  }
  if (/certif|milestone|hours/.test(lower)) {
    return out(
      milestone
        ? `You have **${v.total_hours} verified hours**. Your next certificate unlocks at **${milestone} hours** — ${toGo} hours to go. That is about ${Math.ceil(toGo / 4)} more four-hour shifts.`
        : `You have **${v.total_hours} verified hours** and every milestone certificate up to 500 hours. Remarkable.`,
      [],
      ['Find shifts to reach it faster', 'How is my impact score calculated?'],
    );
  }
  if (/impact|score/.test(lower)) {
    return out(`Your impact score is **${v.impact_score} / 100**. Each verified hour earns 0.1 points, with bonuses: +20% for shifts needing 3+ skills, +15% when you check in on time, and +10% while your attendance stays at 90% or above.`, [], ['How can I raise it faster?']);
  }
  if (/check.?in|qr|gps/.test(lower)) {
    return out(`Check-in opens 15 minutes before your shift and closes 30 minutes after it starts. Allow location access, stand within the venue's check-in radius, and scan the QR code your coordinator shows.`, [], ['What if my GPS is weak?']);
  }
  if (/weather|football|recipe|code|politic|capital of/.test(lower)) {
    return out(`I'm here just for your volunteering, ${first} — shifts, hours, certificates and finding opportunities. I can't help with that one.`, [], ['When is my next shift?', 'Suggest the best opportunities for me']);
  }
  return out(`Hi ${first}! I can help with your schedule, hours, certificates and finding shifts that suit you. Try “When is my next shift?” — or ask in Amharic.`, [], ['When is my next shift?', 'Suggest the best opportunities for me']);
}

export const chatHandlers = [
  http.post(
    api('/volunteer/chat'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, { message: { required: true, type: 'string', max: 1000 } });
      if (invalid) return invalid;
      const v = actor.volunteer!;
      if (b.forget_location) locations[v.id] = undefined;
      if (typeof b.latitude === 'number' && typeof b.longitude === 'number') {
        locations[v.id] = { latitude: b.latitude, longitude: b.longitude, label: (b.location_label as string) ?? null, source: b.location_source === 'map' ? 'picked on map' : 'phone GPS' };
      }
      const r = reply(String(b.message), v.id);
      const at = nowIso();
      const list = listOf(v.id);
      let th = list.find((x) => x.id === b.thread_id);
      if (!th) {
        const text = String(b.message).trim();
        th = { id: `mock-${++seq}-${Date.now()}`, title: text.charAt(0).toUpperCase() + text.slice(1, 60), created_at: at, updated_at: at, turns: [] };
      } else {
        list.splice(list.indexOf(th), 1);
      }
      th.turns.push({ role: 'user', text: String(b.message), at }, { role: 'model', text: r.response, at, cards: r.cards, follow_ups: r.follow_ups, ask_location: r.ask_location });
      th.turns = th.turns.slice(-40);
      th.updated_at = at;
      list.unshift(th);
      const loc = locations[v.id];
      return json({
        data: { status: 'success', bot_name: 'VolunBot', thread_id: th.id, thread_title: th.title, query: b.message, timestamp: at, degraded: false, location: loc ? { source: loc.source, label: loc.label } : null, ...r },
      });
    }),
  ),
  http.get(
    api('/volunteer/chat/history'),
    authed(['Volunteer'], ({ request, actor }) => {
      const id = new URL(request.url).searchParams.get('thread_id');
      const list = listOf(actor.volunteer!.id);
      const th = id ? list.find((x) => x.id === id) : list[0];
      const loc = locations[actor.volunteer!.id];
      return json({
        status: 'success',
        thread_id: th?.id ?? null,
        title: th?.title ?? null,
        data: (th?.turns ?? []).map((t) => ({ role: t.role, content: t.text, created_at: t.at, cards: t.cards ?? [], follow_ups: t.follow_ups ?? [], ask_location: t.ask_location ?? false })),
        location: loc ? { source: loc.source, label: loc.label } : null,
      });
    }),
  ),
  http.get(
    api('/volunteer/chat/threads'),
    authed(['Volunteer'], ({ actor }) =>
      json({
        status: 'success',
        data: listOf(actor.volunteer!.id).map((t) => ({ id: t.id, title: t.title, preview: (t.turns.at(-1)?.text ?? '').replace(/\*\*/g, '').slice(0, 90), messages_count: t.turns.length, created_at: t.created_at, updated_at: t.updated_at })),
      }),
    ),
  ),
  http.delete(
    api('/volunteer/chat/threads/:id'),
    authed(['Volunteer'], ({ params, actor }) => {
      threads[actor.volunteer!.id] = listOf(actor.volunteer!.id).filter((t) => t.id !== params.id);
      return json({ status: 'success', message: 'Conversation deleted.' });
    }),
  ),
];
