/**
 * Skills are stored by the backend as lowercase snake_case keys ("first_aid").
 * The UI always normalizes input to that form and humanizes it for display.
 */
export function normalizeSkill(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ሀ-፿]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Client mirror of App\Services\SkillMatchingService::calculateMatchScore —
 * percentage of required skills the volunteer has (case-insensitive, 2 decimals). No requirements = 100.
 */
export function matchScore(volunteerSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100;
  const have = new Set(volunteerSkills.map((s) => s.toLowerCase()));
  const matched = requiredSkills.filter((s) => have.has(s.toLowerCase())).length;
  return Math.round((matched / requiredSkills.length) * 10_000) / 100;
}

export function skillDiff(volunteerSkills: string[], requiredSkills: string[]) {
  const have = new Set(volunteerSkills.map((s) => s.toLowerCase()));
  return {
    matched: requiredSkills.filter((s) => have.has(s.toLowerCase())),
    missing: requiredSkills.filter((s) => !have.has(s.toLowerCase())),
  };
}

export type MatchTier = 'strong' | 'good' | 'partial' | 'low';

export function matchTier(score: number): MatchTier {
  if (score >= 90) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 30) return 'partial';
  return 'low';
}

/** Skills catalogue (backend keys) used for pickers; free text is also accepted and normalized. */
export const SKILL_CATALOGUE = [
  'first_aid',
  'medical',
  'nursing',
  'disaster_response',
  'crisis_management',
  'logistics',
  'driving',
  'heavy_lifting',
  'teaching',
  'tutoring',
  'storytelling',
  'child_care',
  'elderly_care',
  'counseling',
  'translation',
  'amharic',
  'afaan_oromo',
  'tigrinya',
  'cooking',
  'food_distribution',
  'construction',
  'it_support',
  'photography',
  'event_planning',
  'fundraising',
  'leadership',
  'data_entry',
] as const;

/** Mirror of config('vms.certificate_milestones'). */
export const CERTIFICATE_MILESTONES = [10, 25, 50, 100, 200, 500] as const;

export function nextMilestone(hours: number): number | null {
  return CERTIFICATE_MILESTONES.find((m) => m > hours) ?? null;
}

export function previousMilestone(hours: number): number {
  return [...CERTIFICATE_MILESTONES].reverse().find((m) => m <= hours) ?? 0;
}

/**
 * Availability arrives as either a string list (["weekends", "weekday_mornings"]) or the seeder's
 * object form ({ weekends: true }). Normalize to the list of enabled keys.
 */
export function normalizeAvailability(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, on]) => Boolean(on))
      .map(([k]) => k);
  }
  return [];
}

export const AVAILABILITY_SLOTS = [
  { key: 'weekday_mornings', label: 'Weekday mornings' },
  { key: 'weekday_afternoons', label: 'Weekday afternoons' },
  { key: 'weekday_evenings', label: 'Weekday evenings' },
  { key: 'saturdays', label: 'Saturdays' },
  { key: 'sundays', label: 'Sundays' },
  { key: 'holidays', label: 'Public holidays' },
] as const;
