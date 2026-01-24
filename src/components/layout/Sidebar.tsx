import { LayoutDashboard, Sliders, AudioWaveform, GitBranch, Volume2 } from 'lucide-react';
import { useUIStore, selectSidebarOpen, selectActiveView } from '../../stores';
import type { ViewType } from '../../types';
import { cn } from '../../lib/utils';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'channels', label: 'Channels', icon: Volume2 },
  { id: 'eq', label: 'EQ Editor', icon: AudioWaveform },
  { id: 'routing', label: 'Routing', icon: GitBranch },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export function Sidebar() {
  const isOpen = useUIStore(selectSidebarOpen);
  const activeView = useUIStore(selectActiveView);
  const setActiveView = useUIStore((state) => state.setActiveView);

  return (
    <aside
      className={cn(
        "bg-dsp-surface border-r border-dsp-primary/30 transition-all duration-200",
        isOpen ? "w-56" : "w-16"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <nav className="p-2 space-y-1" role="menubar" aria-label="Navigation menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-dsp-accent text-white"
                  : "hover:bg-dsp-primary/50 text-dsp-text-muted hover:text-dsp-text"
              )}
              role="menuitem"
              aria-current={isActive ? 'page' : undefined}
              aria-label={!isOpen ? item.label : undefined}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {isOpen && <span className="text-sm">{item.label}</span>}
              {!isOpen && <span className="sr-only">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
