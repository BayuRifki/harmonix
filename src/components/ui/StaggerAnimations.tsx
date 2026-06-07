import { motion, Variants } from 'framer-motion';

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 220, damping: 28 },
  },
};

export const staggerItemFast: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 30 },
  },
};

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.015,
      delayChildren: 0.05,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 30 },
  },
};

export function StaggerList<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactElement,
  options: { className?: string; itemClassName?: string } = {},
): JSX.Element {
  return (
    <motion.ul
      variants={listVariants}
      initial="hidden"
      animate="show"
      className={options.className}
      data-testid="stagger-list"
    >
      {items.map((item, index) => (
        <motion.li key={index} variants={itemVariants} className={options.itemClassName}>
          {renderItem(item, index)}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export const gridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 26 },
  },
};

export function StaggerGrid<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactElement,
  options: { className?: string; itemClassName?: string } = {},
): JSX.Element {
  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className={`grid gap-4 ${options.className || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}
      data-testid="stagger-grid"
    >
      {items.map((item, index) => (
        <motion.div key={index} variants={cardVariants} className={options.itemClassName}>
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createStaggeredTransition(
  staggerMs: number = 20,
  startDelayMs: number = 100,
): { staggerChildren: number; delayChildren: number } {
  return {
    staggerChildren: staggerMs / 1000,
    delayChildren: startDelayMs / 1000,
  };
}
