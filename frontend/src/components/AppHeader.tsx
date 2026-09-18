import React from 'react';
import { Eye, Command, Sun, Moon } from 'lucide-react';
import { Session } from '../api';

interface AppHeaderProps {
  activeSession: Session | null;
  durationMinutes: number;
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenCommandPalette: () => void;
  mode: 'DEMO' | 'LIVE';
  onToggleMode?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeSession,
  durationMinutes,
  focusMode,
  onToggleFocus,
  onOpenCommandPalette,
  theme = 'dark',
  onToggleTheme,
}) => {
  // Contextual greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="product-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {getGreeting()}
        </span>
        <span style={{ color: 'var(--border-hairline-bright)' }}>/</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {activeSession ? (
            <span>
              Working on <strong style={{ color: 'var(--text-main)' }}>Two Sum</strong> (LeetCode)
            </span>
          ) : (
            'Workspace ready'
          )}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'var(--bay-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '5px',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
          title="Search commands (⌘K)"
        >
          <Command size={12} />
          <span>Search</span>
          <kbd
            style={{
              padding: '1px 4px',
              background: 'var(--bay-hover)',
              borderRadius: '3px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle (Light / Dark) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'var(--bay-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '5px',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={13} style={{ color: '#f59e0b' }} /> : <Moon size={13} style={{ color: '#6366f1' }} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        )}

        {/* Focus Mode Toggle */}
        <button
          onClick={onToggleFocus}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: focusMode ? 'rgba(99, 102, 241, 0.15)' : 'var(--bay-elevated)',
            border: `1px solid ${focusMode ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-hairline)'}`,
            borderRadius: '5px',
            color: focusMode ? 'var(--laser-violet)' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
          title="Toggle Focus Mode (⌘⇧F)"
        >
          <Eye size={13} />
          <span>Focus</span>
        </button>

        {/* Ambient Session Status */}
        {activeSession && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              paddingLeft: '0.5rem',
              borderLeft: '1px solid var(--border-hairline)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
              }}
            />
            <span style={{ color: 'var(--text-main)' }}>
              {durationMinutes > 0 ? `${durationMinutes}m active` : 'Active'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
