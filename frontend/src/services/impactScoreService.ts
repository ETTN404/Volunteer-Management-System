/**
 * Impact Score & Milestone Service
 * Reference: VMS Master Plan Section 6.2 & Section 14.1
 */
export class ImpactScoreService {
  public static readonly MILESTONES = [10, 25, 50, 100, 200, 500]; // In hours
  public static readonly BASE_RATE_PER_HOUR = 0.1;
  public static readonly MAX_SCORE = 100;

  /**
   * Calculates score increment for a completed shift with bonus multipliers
   */
  public static calculateIncrement(params: {
    hoursWorked: number;
    requiredSkillsCount: number;
    isOnTime: boolean;
    attendanceRate: number; // percentage e.g. 95
  }): {
    basePoints: number;
    multipliers: {
      skillBonus: number; // +20% if >= 3 skills
      punctualityBonus: number; // +15% if on-time
      reliabilityBonus: number; // +10% if attendance >= 90%
    };
    totalMultiplier: number;
    totalEarned: number;
  } {
    const basePoints = params.hoursWorked * this.BASE_RATE_PER_HOUR;

    let skillBonus = 0;
    if (params.requiredSkillsCount >= 3) {
      skillBonus = 0.2; // +20%
    }

    let punctualityBonus = 0;
    if (params.isOnTime) {
      punctualityBonus = 0.15; // +15%
    }

    let reliabilityBonus = 0;
    if (params.attendanceRate >= 90) {
      reliabilityBonus = 0.1; // +10%
    }

    const totalMultiplier = 1 + skillBonus + punctualityBonus + reliabilityBonus;
    const totalEarned = Math.round(basePoints * totalMultiplier * 100) / 100;

    return {
      basePoints: Math.round(basePoints * 100) / 100,
      multipliers: {
        skillBonus,
        punctualityBonus,
        reliabilityBonus,
      },
      totalMultiplier: Math.round(totalMultiplier * 100) / 100,
      totalEarned,
    };
  }

  /**
   * Checks if any milestone tiers were newly crossed
   */
  public static checkMilestones(
    prevHours: number,
    newHours: number
  ): number[] {
    const crossed: number[] = [];
    for (const milestone of this.MILESTONES) {
      if (prevHours < milestone && newHours >= milestone) {
        crossed.push(milestone);
      }
    }
    return crossed;
  }

  /**
   * Returns current milestone progress information
   */
  public static getMilestoneProgress(totalHours: number): {
    currentMilestone: number | null;
    nextMilestone: number;
    hoursToNext: number;
    progressPercent: number;
  } {
    let current: number | null = null;
    let next = this.MILESTONES[0];

    for (let i = 0; i < this.MILESTONES.length; i++) {
      if (totalHours >= this.MILESTONES[i]) {
        current = this.MILESTONES[i];
        next = this.MILESTONES[i + 1] || this.MILESTONES[i];
      } else {
        next = this.MILESTONES[i];
        break;
      }
    }

    const prevThreshold = current || 0;
    const range = next - prevThreshold;
    const completedInRange = Math.max(0, totalHours - prevThreshold);
    const progressPercent = Math.min(100, Math.round((completedInRange / (range || 1)) * 100));
    const hoursToNext = Math.max(0, Math.round((next - totalHours) * 10) / 10);

    return {
      currentMilestone: current,
      nextMilestone: next,
      hoursToNext,
      progressPercent,
    };
  }
}
