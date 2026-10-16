import { describe, expect, it } from 'vitest';
import { checkGeofence, distanceMeters, formatDistance, offsetMeters } from './geo';
import { checkInWindow, countdownTo, parseApiDate, toApiDateTime } from './time';
import { matchScore, matchTier, nextMilestone, normalizeAvailability, normalizeSkill, skillDiff } from './skills';
import { formatHours, initials, humanizeSkill } from './format';

const MESKEL = { latitude: 9.010733, longitude: 38.761269 };

describe('geo', () => {
  it('measures zero distance to itself', () => {
    expect(distanceMeters(MESKEL, MESKEL)).toBe(0);
  });

  it('round-trips an offset within a meter', () => {
    const p = offsetMeters(MESKEL, 120, -50);
    expect(distanceMeters(MESKEL, p)).toBeCloseTo(130, 0);
  });

  it('flags inside / outside the geofence like GeofenceService', () => {
    expect(checkGeofence(offsetMeters(MESKEL, 90, 0), MESKEL, 100).inside).toBe(true);
    const out = checkGeofence(offsetMeters(MESKEL, 250, 0), MESKEL, 100);
    expect(out.inside).toBe(false);
    expect(out.outsideBy).toBeCloseTo(150, 0);
  });

  it('formats distances', () => {
    expect(formatDistance(42.4)).toBe('42 m');
    expect(formatDistance(1530)).toBe('1.5 km');
  });
});

describe('time', () => {
  it('parses naive Laravel datetimes as UTC', () => {
    expect(parseApiDate('2026-10-16 09:00:00')!.toISOString()).toBe('2026-10-16T09:00:00.000Z');
    expect(parseApiDate('2026-10-16T09:00:00.000000Z')!.toISOString()).toBe('2026-10-16T09:00:00.000Z');
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate('garbage')).toBeNull();
  });

  it('serializes to Y-m-d H:i:s in UTC', () => {
    expect(toApiDateTime(new Date('2026-10-16T06:30:00.000Z'))).toBe('2026-10-16 06:30:00');
  });

  it('computes the -15/+30 minute check-in window', () => {
    const start = '2026-10-16T09:00:00.000Z';
    expect(checkInWindow(start, new Date('2026-10-16T08:40:00Z'))!.state).toBe('early');
    expect(checkInWindow(start, new Date('2026-10-16T08:50:00Z'))!.state).toBe('open');
    expect(checkInWindow(start, new Date('2026-10-16T09:29:00Z'))!.state).toBe('open');
    expect(checkInWindow(start, new Date('2026-10-16T09:31:00Z'))!.state).toBe('closed');
  });

  it('counts down', () => {
    const c = countdownTo(new Date('2026-10-17T10:01:05Z'), new Date('2026-10-16T09:00:00Z'));
    expect(c).toMatchObject({ days: 1, hours: 1, minutes: 1, seconds: 5 });
  });
});

describe('skills', () => {
  it('mirrors SkillMatchingService::calculateMatchScore', () => {
    expect(matchScore(['first_aid'], [])).toBe(100);
    expect(matchScore(['First_Aid', 'logistics'], ['first_aid', 'medical'])).toBe(50);
    expect(matchScore(['a'], ['a', 'b', 'c'])).toBe(33.33);
  });

  it('diffs matched / missing skills', () => {
    expect(skillDiff(['first_aid'], ['first_aid', 'medical'])).toEqual({ matched: ['first_aid'], missing: ['medical'] });
  });

  it('tiers match scores', () => {
    expect(matchTier(100)).toBe('strong');
    expect(matchTier(66)).toBe('good');
    expect(matchTier(33)).toBe('partial');
    expect(matchTier(0)).toBe('low');
  });

  it('normalizes free-text skills to backend keys', () => {
    expect(normalizeSkill('  First Aid ')).toBe('first_aid');
    expect(normalizeSkill('IT-Support!')).toBe('it_support');
  });

  it('normalizes both availability shapes', () => {
    expect(normalizeAvailability(['saturdays'])).toEqual(['saturdays']);
    expect(normalizeAvailability({ weekends: true, weekdays_morning: false })).toEqual(['weekends']);
    expect(normalizeAvailability(null)).toEqual([]);
  });

  it('finds the next certificate milestone', () => {
    expect(nextMilestone(46.5)).toBe(50);
    expect(nextMilestone(600)).toBeNull();
  });
});

describe('format', () => {
  it('formats hours, initials and skills', () => {
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(12.25)).toBe('12.3 h');
    expect(initials('Hana Tesfaye')).toBe('HT');
    expect(initials('')).toBe('?');
    expect(humanizeSkill('crisis_management')).toBe('Crisis management');
  });
});
