/** DreamOS86 motion system — consistent, premium, performance-conscious */
import type { Transition, Variants } from "framer-motion";

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.45, 0, 0.55, 1] as const,
};

export const duration = {
  fast: 0.22,
  base: 0.38,
  slow: 0.55,
};

export const transition = {
  page: {
    duration: duration.base,
    ease: ease.out,
  } satisfies Transition,
  card: {
    duration: duration.fast,
    ease: ease.out,
  } satisfies Transition,
  stagger: (delay = 0.06) =>
    ({
      staggerChildren: delay,
      delayChildren: 0.02,
    }) as const,
} as const;

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: transition.page,
    },
  } satisfies Variants,
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: transition.page },
  } satisfies Variants,
  staggerContainer: {
    hidden: {},
    show: {
      transition: transition.stagger(0.07),
    },
  } satisfies Variants,
  staggerItem: {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: duration.base, ease: ease.out },
    },
  } satisfies Variants,
} as const;

export const whileHover = {
  lift: { y: -5, scale: 1.005, transition: transition.card },
  liftSubtle: { y: -3, transition: transition.card },
  glow: { scale: 1.01, transition: transition.card },
  /** Cards — lift + subtle shadow enhancement */
  card: {
    y: -4,
    scale: 1.004,
    transition: transition.card,
  },
} as const;

export const whileTap = {
  press: { scale: 0.985, transition: { duration: 0.1, ease: [0.22, 1, 0.36, 1] } },
  pressLight: { scale: 0.993, transition: { duration: 0.08 } },
} as const;

/** Reusable motion props for interactive cards */
export const motionCard = {
  whileHover: whileHover.card,
  whileTap: whileTap.pressLight,
} as const;

/** Reusable motion props for interactive buttons */
export const motionButton = {
  whileTap: whileTap.press,
} as const;
