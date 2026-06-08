import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GripVertical, type LucideIcon } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';

export interface SortableNavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export function SortableNavItem({
  to,
  label,
  icon: Icon,
  disabled = false,
}: SortableNavItemProps): JSX.Element {
  const enabled = useUiStore((s) => !s.reducedMotion);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: to,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <NavLink
      ref={setNodeRef as unknown as React.Ref<HTMLAnchorElement>}
      to={to}
      end={to === '/'}
      style={style}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mt-0.5 animate-slide-in group ${
          isActive
            ? 'bg-zinc-800/60 text-white'
            : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100 active:scale-[0.98]'
        } ${isDragging ? 'shadow-glow ring-1 ring-brand-500/40' : ''}`
      }
      data-testid={`sidebar-nav-${to.replace(/\//g, '_') || 'home'}`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand-400"
              style={{
                boxShadow: '0 0 8px rgba(236, 72, 153, 0.6), 0 0 16px rgba(236, 72, 153, 0.3)',
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              data-testid="sidebar-active-indicator"
            />
          )}
          <span
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Reorder ${label}`}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
            data-testid={`sidebar-nav-handle-${to.replace(/\//g, '_') || 'home'}`}
          >
            <GripVertical size={11} aria-hidden />
          </span>
          <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
          <span className="truncate pr-5">{label}</span>
          {enabled && isDragging && <span className="sr-only"> (dragging)</span>}
        </>
      )}
    </NavLink>
  );
}
