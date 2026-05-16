import type { Transition, Variants } from "framer-motion";

/// Shared motion tokens — these mirror the CSS variables in globals.css.
/// Use these instead of inlining durations/easings on every Framer Motion call.
export const duration = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
};

export const transitions = {
  base: { duration: duration.base, ease: ease.out } satisfies Transition,
  fast: { duration: duration.fast, ease: ease.out } satisfies Transition,
  slow: { duration: duration.slow, ease: ease.out } satisfies Transition,
};

/// Page-level entry — opacity + tiny y. Avoid scale/spring (reads as AI flourish).
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -2, transition: transitions.fast },
};

/// Card/section entry — slightly slower than page.
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: transitions.slow },
};

/// Staggered list entry — wrap children in a motion container with
/// `variants={listContainer}` then each item with `variants={listItem}`.
export const listContainer: Variants = {
  initial: { opacity: 1 },
  enter: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.04 },
  },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: transitions.fast },
};

/// Overlay (modal backdrop) entry/exit.
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: transitions.fast },
  exit: { opacity: 0, transition: transitions.fast },
};

/// Modal/dialog content entry — subtle scale, no spring.
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.98, y: 4 },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.base,
  },
  exit: { opacity: 0, scale: 0.98, y: 2, transition: transitions.fast },
};
