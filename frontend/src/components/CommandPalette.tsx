import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Home,
  Activity,
  History,
  LineChart,
  ShieldCheck,
  FlaskConical,
  Eye,
  Settings,
  X,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onToggleFocus: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleFocus,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'home', label: 'Go to Home', desc: 'Workspace summary and recent activity', icon: Home, action: () => { onNavigate('home'); onClose(); } },
    { id: 'live', label: 'Go to Live Session', desc: 'Active task state, workload & fatigue', icon: Activity, action: () => { onNavigate('live'); onClose(); } },
    { id: 'history', label: 'View History', desc: 'Past sessions, duration and trajectory logs', icon: History, action: () => { onNavigate('history'); onClose(); } },
    { id: 'signals', label: 'Open Signals Oscilloscope', desc: 'High-resolution multi-channel waveform & 69-frame trace', icon: LineChart, action: () => { onNavigate('signals'); onClose(); } },
    { id: 'evidence', label: 'Inspect Evidence Trace', desc: '7-stage pipeline verification and cryptographic hash', icon: ShieldCheck, action: () => { onNavigate('evidence'); onClose(); } },
    { id: 'evaluation', label: 'Evaluation Lab', desc: 'Controlled benchmarks & diff matrix for reviewers', icon: FlaskConical, action: () => { onNavigate('evaluation'); onClose(); } },
    { id: 'focus', label: 'Toggle Focus Mode', desc: 'Switch to distraction-free ambient workspace', icon: Eye, action: () => { onToggleFocus(); onClose(); } },
    ...(onToggleTheme ? [{
      id: 'theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      desc: `Toggle application visual theme to ${theme === 'dark' ? 'light alabaster' : 'dark obsidian'}`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => { onToggleTheme(); onClose(); }
    }] : []),
    { id: 'settings', label: 'Settings & Privacy', desc: 'Signal sources, local storage & parameters', icon: Settings, action: () => { onNavigate('settings'); onClose(); } },
    { id: 'platform', label: 'Product Website', desc: 'Public platform homepage & pricing', icon: ExternalLink, action: () => { onNavigate('platform'); onClose(); } },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border-hairline)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or jump to screen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
            }}
          />
          <kbd style={{ fontSize: '10px', background: 'var(--bay-hover)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px' }}>
          {filtered.length > 0 ? (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bay-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ color: 'var(--laser-violet)', display: 'flex', alignItems: 'center' }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {cmd.label}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {cmd.desc}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No commands found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
