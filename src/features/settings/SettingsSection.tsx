import { type ReactNode, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';

export interface SettingsSectionProps {
  /**
   * Unique namespaced key for this section. The key is persisted
   * in `uiStore.settingsCollapsedSections` and survives reloads.
   * Use a stable, descriptive id like `audio:crossfade` or
   * `appearance:theme`. The namespace prefix should match the
   * tab the section lives in.
   */
  id: string;
  /** Header title shown in the collapsible header. */
  title: string;
  /**
   * Optional short description shown in the header next to the
   * title. Use this to give a one-line hint about what the
   * section contains — helps the user decide whether to expand.
   */
  description?: string;
  /**
   * Optional badge content rendered on the right of the header
   * (e.g. a status pill). Kept in the header so it's visible
   * even when the body is collapsed.
   */
  badge?: ReactNode;
  /**
   * The section body. Hidden when collapsed. Animated on toggle
   * with a height transition that respects `prefers-reduced-motion`.
   */
  children: ReactNode;
}

/**
 * Collapsible section used inside the tabbed Settings view.
 *
 * Why a dedicated component?
 *   - The Settings page is split into 5 tabs; each tab contains
 *     1-3 collapsible sections. With the "click to reveal" UX,
 *     every section is collapsed by default, so the header is the
 *     only visible element until the user expands it. The
 *     collapsed-state lookup is O(1) and the height transition
 *     uses framer-motion which already understands the user's
 *     reduced-motion preference.
 *   - Centralising the markup here keeps `SettingsTabs.tsx` and
 *     `SettingsView.tsx` focused on layout. Adding a new section
 *     is a 2-line change.
 *
 * The collapse state is read synchronously on first render so the
 * user never sees a "flash of expanded content" on mount — a
 * common bug in collapsible widgets that hydrate from async state.
 */
export function SettingsSection({
  id,
  title,
  description,
  badge,
  children,
}: SettingsSectionProps): JSX.Element {
  const collapsed = useUiStore((s) => s.isSettingsSectionCollapsed(id));
  const toggle = useUiStore((s) => s.toggleSettingsSectionCollapsed);
  const expand = useUiStore((s) => s.expandSettingsSection);
  const dismissHint = useUiStore((s) => s.dismissSettingsHint);
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  // Track whether the user has interacted with this section.
  // On the first expand we dismiss the global "Click a section to
  // expand" hint. Refs are used to avoid an extra re-render.
  const expandedOnceRef = useRef(false);
  useEffect(() => {
    if (!collapsed && !expandedOnceRef.current) {
      expandedOnceRef.current = true;
      dismissHint();
    }
  }, [collapsed, dismissHint]);

  const handleClick = (): void => {
    if (collapsed) {
      expand(id);
    } else {
      toggle(id);
    }
  };

  const headerId = `settings-section-${id}-header`;
  const panelId = `settings-section-${id}-panel`;

  return (
    <section
      data-testid={`settings-section-${id}`}
      data-collapsed={collapsed}
      className="bg-surface border border-app rounded-lg overflow-hidden"
    >
      <button
        type="button"
        id={headerId}
        onClick={handleClick}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        data-testid={`settings-section-toggle-${id}`}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-app">{title}</h3>
          {description && (
            <p className="text-[11px] text-app-muted mt-0.5 truncate">{description}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        <motion.span
          aria-hidden
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          className="shrink-0 text-app-muted"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            initial={reducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { height: { duration: 0.22, ease: 'easeOut' }, opacity: { duration: 0.18 } }
            }
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 pt-1 border-t border-app">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
