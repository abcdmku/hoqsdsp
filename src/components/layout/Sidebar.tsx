import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sliders, GitBranch, Share2, Sparkles } from 'lucide-react';
import { useUIStore, selectSidebarOpen } from '../../stores';
import type { ViewType } from '../../types';
import { cn } from '../../lib/utils';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, path: '/' },
  { id: 'signal-flow', label: 'Signal', icon: Share2, path: '/signal-flow' },
  { id: 'opus', label: 'Opus', icon: Sparkles, path: '/opus' },
  { id: 'routing', label: 'Routing', icon: GitBranch, path: '/routing' },
  { id: 'settings', label: 'Settings', icon: Sliders, path: '/settings' },
];

export function Sidebar() {
  const isOpen = useUIStore(selectSidebarOpen);

  return (
    <aside
      id="sidebar"
      className={cn(
        'bg-dsp-surface border-r border-dsp-primary/50',
        'transition-[width] duration-200 ease-out',
        isOpen ? 'w-60' : 'w-16'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                  isActive
                    ? 'bg-dsp-primary/70 text-dsp-text border border-dsp-primary/80'
                    : 'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/40 border border-transparent'
                )
              }
              aria-label={!isOpen ? item.label : undefined}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {isOpen && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!isOpen && <span className="sr-only">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
