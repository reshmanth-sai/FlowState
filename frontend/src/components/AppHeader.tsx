import React from 'react';
import { Eye, Command } from 'lucide-react';
import { Session } from '../api';

interface AppHeaderProps {
  activeSession: Session | null;
  durationMinutes: number;
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenCommandPalette: () => void;
  mode: 'DEMO' | 'LIVE';
  onToggleMode?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeSession,
  durationMinutes,
  focusMode,
  onToggleFocus,
  onOpenCommandPalette,
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
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f3f4f6' }}>
          {getGreeting()}
        </span>
        <span style={{ color: '#374151' }}>/</span>
        <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
          {activeSession ? (
            <span>
              Working on <strong style={{ color: '#e5e7eb' }}>Two Sum</strong> (LeetCode)
            </span>
          ) : (
            'Workspace ready'
          )}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid #1f2230',
            borderRadius: '5px',
            color: '#9ca3af',
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
              background: '#161922',
              borderRadius: '3px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#6b7280',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Focus Mode Toggle */}
        <button
          onClick={onToggleFocus}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: focusMode ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: `1px solid ${focusMode ? 'rgba(99, 102, 241, 0.4)' : '#1f2230'}`,
            borderRadius: '5px',
            color: focusMode ? '#a5b4fc' : '#9ca3af',
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
              color: '#9ca3af',
              paddingLeft: '0.5rem',
              borderLeft: '1px solid #1e2230',
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
            <span style={{ color: '#d1d5db' }}>
              {durationMinutes > 0 ? `${durationMinutes}m active` : 'Active'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
