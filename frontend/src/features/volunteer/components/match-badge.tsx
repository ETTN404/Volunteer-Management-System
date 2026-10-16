import { matchTier } from '@/shared/lib/skills';
import { Badge } from '@/shared/ui';

const TONE = { strong: 'success', good: 'accent', partial: 'warning', low: 'neutral' } as const;

export function MatchBadge({ score, size = 'sm' }: { score: number | undefined; size?: 'sm' | 'md' }) {
  if (score == null) return null;
  return (
    <Badge tone={TONE[matchTier(score)]} size={size} className="type-data">
      {Math.round(score)}% match
    </Badge>
  );
}
