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
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onToggleFocus: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleFocus,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #1c1f2b' }}>
          <Search size={16} style={{ color: '#6b7280' }} />
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
              color: '#f3f4f6',
              fontSize: '0.9rem',
            }}
          />
          <kbd style={{ fontSize: '10px', background: '#161823', padding: '2px 6px', borderRadius: '4px', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
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
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#f3f4f6' }}>
                      {cmd.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cmd.desc}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.82rem' }}>
              No commands matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
