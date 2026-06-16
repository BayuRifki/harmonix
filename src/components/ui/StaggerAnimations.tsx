/* eslint-disable react-refresh/only-export-components */
import { motion, Variants, useReducedMotion as useFramerReducedMotion } from 'framer-motion';

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

export const listVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const itemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

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

export const gridVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const cardVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

function getVariants(reduced: boolean) {
  if (reduced) {
    return {
      list: listVariantsReduced,
      item: itemVariantsReduced,
      grid: gridVariantsReduced,
      card: cardVariantsReduced,
    };
  }
  return {
    list: listVariants,
    item: itemVariants,
    grid: gridVariants,
    card: cardVariants,
  };
}

export function StaggerList<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactElement,
  options: { className?: string; itemClassName?: string; reduced?: boolean } = {},
): JSX.Element {
  const prefersReduced = useFramerReducedMotion() ?? false;
  const reduced = options.reduced ?? prefersReduced;
  const v = getVariants(reduced);
  return (
    <motion.ul
      variants={v.list}
      initial="hidden"
      animate="show"
      className={options.className}
      data-testid="stagger-list"
    >
      {items.map((item, index) => (
        <motion.li key={index} variants={v.item} className={options.itemClassName}>
          {renderItem(item, index)}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function StaggerGrid<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactElement,
  options: { className?: string; itemClassName?: string; reduced?: boolean } = {},
): JSX.Element {
  const prefersReduced = useFramerReducedMotion() ?? false;
  const reduced = options.reduced ?? prefersReduced;
  const v = getVariants(reduced);
  return (
    <motion.div
      variants={v.grid}
      initial="hidden"
      animate="show"
      className={`grid gap-4 ${options.className || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}
      data-testid="stagger-grid"
    >
      {items.map((item, index) => (
        <motion.div key={index} variants={v.card} className={options.itemClassName}>
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
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

export const useReducedMotion = useFramerReducedMotion;
