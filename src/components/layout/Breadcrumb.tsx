import { useMemo } from 'react';
import { Link, useLocation, useParams, matchPath } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
  icon?: typeof Home;
}

interface BreadcrumbContext {
  pattern: string;
  crumbs: Omit<Crumb, 'icon'>[];
}

const CONTEXTS: BreadcrumbContext[] = [
  {
    pattern: '/source/:id',
    crumbs: [{ label: 'Sources', to: '/settings' }, { label: 'Source' }],
  },
  {
    pattern: '/playlists',
    crumbs: [{ label: 'Playlists' }],
  },
  {
    pattern: '/library',
    crumbs: [{ label: 'Library' }],
  },
  {
    pattern: '/favorites',
    crumbs: [{ label: 'Favorites' }],
  },
  {
    pattern: '/explore',
    crumbs: [{ label: 'Explore' }],
  },
  {
    pattern: '/equalizer',
    crumbs: [{ label: 'Equalizer' }],
  },
  {
    pattern: '/settings',
    crumbs: [{ label: 'Settings' }],
  },
  {
    pattern: '/search',
    crumbs: [{ label: 'Search' }],
  },
];

const HIDDEN_PATHS = new Set(['/', '/now-playing', '/mini']);

export function Breadcrumb(): JSX.Element | null {
  const location = useLocation();
  const params = useParams();

  const crumbs = useMemo<Crumb[]>(() => {
    if (HIDDEN_PATHS.has(location.pathname)) return [];

    const context = CONTEXTS.find((c) =>
      matchPath({ path: c.pattern, end: true }, location.pathname),
    );

    if (!context) return [];

    return context.crumbs.map((c, i) => {
      const label = interpolateLabel(c.label, params);
      return { label, to: c.to, icon: i === 0 ? Home : undefined };
    });
  }, [location.pathname, params]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      <ol className="flex items-center gap-1 min-w-0">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const Icon = crumb.icon;
          return (
            <li key={i} className="flex items-center gap-1 min-w-0">
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors truncate max-w-[160px]"
                >
                  {Icon && <Icon size={11} aria-hidden />}
                  <span className="truncate">{crumb.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded truncate max-w-[200px] ${
                    isLast ? 'text-zinc-100 font-medium' : 'text-zinc-400'
                  }`}
                >
                  {Icon && <Icon size={11} aria-hidden />}
                  <span className="truncate">{crumb.label}</span>
                </span>
              )}
              {!isLast && <ChevronRight size={12} className="text-zinc-700 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function interpolateLabel(label: string, params: Record<string, string | undefined>): string {
  let out = label;
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      out = out.replace(`:${key}`, value);
    }
  }
  return out;
}
