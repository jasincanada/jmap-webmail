import { cn } from '@/lib/utils';

export interface DedupeEmailHighlight {
  colorIndex: number;
  isKeeper: boolean;
  groupKey: string;
}

const DEDUPE_GROUP_STYLES = [
  {
    bg: 'bg-rose-100/70 dark:bg-rose-950/35',
    keeperBg: 'bg-rose-50/50 dark:bg-rose-950/20',
    stripe: 'border-l-rose-500',
    ring: 'ring-rose-300/60 dark:ring-rose-700/50',
  },
  {
    bg: 'bg-amber-100/70 dark:bg-amber-950/35',
    keeperBg: 'bg-amber-50/50 dark:bg-amber-950/20',
    stripe: 'border-l-amber-500',
    ring: 'ring-amber-300/60 dark:ring-amber-700/50',
  },
  {
    bg: 'bg-lime-100/70 dark:bg-lime-950/35',
    keeperBg: 'bg-lime-50/50 dark:bg-lime-950/20',
    stripe: 'border-l-lime-500',
    ring: 'ring-lime-300/60 dark:ring-lime-700/50',
  },
  {
    bg: 'bg-cyan-100/70 dark:bg-cyan-950/35',
    keeperBg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    stripe: 'border-l-cyan-500',
    ring: 'ring-cyan-300/60 dark:ring-cyan-700/50',
  },
  {
    bg: 'bg-violet-100/70 dark:bg-violet-950/35',
    keeperBg: 'bg-violet-50/50 dark:bg-violet-950/20',
    stripe: 'border-l-violet-500',
    ring: 'ring-violet-300/60 dark:ring-violet-700/50',
  },
  {
    bg: 'bg-fuchsia-100/70 dark:bg-fuchsia-950/35',
    keeperBg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20',
    stripe: 'border-l-fuchsia-500',
    ring: 'ring-fuchsia-300/60 dark:ring-fuchsia-700/50',
  },
  {
    bg: 'bg-sky-100/70 dark:bg-sky-950/35',
    keeperBg: 'bg-sky-50/50 dark:bg-sky-950/20',
    stripe: 'border-l-sky-500',
    ring: 'ring-sky-300/60 dark:ring-sky-700/50',
  },
  {
    bg: 'bg-orange-100/70 dark:bg-orange-950/35',
    keeperBg: 'bg-orange-50/50 dark:bg-orange-950/20',
    stripe: 'border-l-orange-500',
    ring: 'ring-orange-300/60 dark:ring-orange-700/50',
  },
] as const;

export function getDedupeHighlightClasses(highlight: DedupeEmailHighlight | null | undefined): string {
  if (!highlight) return '';

  const style = DEDUPE_GROUP_STYLES[highlight.colorIndex % DEDUPE_GROUP_STYLES.length];

  return cn(
    'border-l-4',
    style.stripe,
    highlight.isKeeper ? style.keeperBg : style.bg,
    !highlight.isKeeper && 'ring-1 ring-inset',
    !highlight.isKeeper && style.ring,
  );
}

export function getDedupeStripeColor(colorIndex: number): string {
  return DEDUPE_GROUP_STYLES[colorIndex % DEDUPE_GROUP_STYLES.length].stripe;
}