import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps } from 'motion/react';
import { createElement, useEffect, useRef, type ReactNode } from 'react';

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type RevealTag = 'div' | 'section' | 'header' | 'li' | 'article' | 'span';

/** Fades content up once. The single page-load gesture used across the app. */
export function Reveal({
  as = 'div',
  delay = 0,
  y = 14,
  children,
  className,
  once = true,
  inView = false,
}: {
  as?: RevealTag;
  delay?: number;
  y?: number;
  children: ReactNode;
  className?: string;
  once?: boolean;
  /** Trigger on scroll into view instead of on mount. */
  inView?: boolean;
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as React.ComponentType<HTMLMotionProps<'div'>>;
  const initial = reduce ? { opacity: 0 } : { opacity: 0, y };
  const target = { opacity: 1, y: 0 };
  return (
    <Comp
      className={className}
      initial={initial}
      {...(inView ? { whileInView: target, viewport: { once, margin: '-10% 0px' } } : { animate: target })}
      transition={{ duration: reduce ? 0.2 : 0.7, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </Comp>
  );
}

/** Staggers direct children (each child should be a <StaggerItem>). */
export function Stagger({ children, className, gap = 0.06, delay = 0, as = 'div' }: { children: ReactNode; className?: string; gap?: number; delay?: number; as?: 'div' | 'ul' | 'ol' }) {
  const Comp = motion[as] as React.ComponentType<HTMLMotionProps<'div'>>;
  return (
    <Comp className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as React.ComponentType<HTMLMotionProps<'div'>>;
  return (
    <Comp
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
      }}
    >
      {children}
    </Comp>
  );
}

/** Number that counts up to its value when it scrolls into view. */
export function CountUp({
  value,
  decimals = 0,
  duration = 1.4,
  className,
  format,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-5% 0px' });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (n) =>
    format ? format(n) : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  );

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE_OUT_EXPO });
    return () => controls.stop();
  }, [inView, value, duration, reduce, mv]);

  return (
    <motion.span ref={ref} className={className} aria-label={String(value)}>
      {text}
    </motion.span>
  );
}

/** Route content transition: subtle rise. */
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const reduce = useReducedMotion();
  return createElement(
    motion.div,
    {
      key: routeKey,
      initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.45, ease: EASE_OUT_EXPO },
    },
    children,
  );
}
