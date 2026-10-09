/**
 * Skill Matching Service
 * Reference: VMS Master Plan Section 6.1
 */
export class SkillMatchingService {
  /**
   * Calculates match percentage (0-100%) between volunteer skills and required shift skills
   */
  public static calculateMatchScore(
    volunteerSkills: string[] = [],
    requiredSkills: string[] = []
  ): number {
    if (!requiredSkills || requiredSkills.length === 0) {
      return 100; // No requirements = 100% match
    }

    if (!volunteerSkills || volunteerSkills.length === 0) {
      return 0;
    }

    const normVolunteer = volunteerSkills.map((s) => s.toLowerCase().trim());
    const normRequired = requiredSkills.map((s) => s.toLowerCase().trim());

    let matchCount = 0;
    for (const req of normRequired) {
      if (normVolunteer.includes(req)) {
        matchCount++;
      }
    }

    const ratio = matchCount / normRequired.length;
    return Math.round(ratio * 100);
  }

  /**
   * Returns eligibility breakdown with matched and missing skill lists
   */
  public static assessEligibility(
    volunteerSkills: string[] = [],
    requiredSkills: string[] = []
  ): {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    isFullyQualified: boolean;
  } {
    if (!requiredSkills || requiredSkills.length === 0) {
      return {
        score: 100,
        matchedSkills: [],
        missingSkills: [],
        isFullyQualified: true,
      };
    }

    const normVolunteer = volunteerSkills.map((s) => s.toLowerCase().trim());
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of requiredSkills) {
      if (normVolunteer.includes(req.toLowerCase().trim())) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const score = Math.round((matched.length / requiredSkills.length) * 100);

    return {
      score,
      matchedSkills: matched,
      missingSkills: missing,
      isFullyQualified: missing.length === 0,
    };
  }
}
