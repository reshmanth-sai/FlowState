import React from 'react';
import { Minimize2 } from 'lucide-react';

interface FocusModeOverlayProps {
  isActive: boolean;
  onExit: () => void;
  taskTitle: string;
  durationMinutes: number;
}

export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({
  isActive,
  onExit,
  taskTitle,
  durationMinutes,
}) => {
  if (!isActive) return null;

  return (
    <div className="focus-mode-active" onClick={onExit}>
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: '#a5b4fc',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          <span>Focus Mode Active</span>
        </div>

        <div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>
            {taskTitle || 'Two Sum'}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '4px' }}>
            LeetCode • {durationMinutes || 18}m in flow
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.85rem 1.5rem',
            background: '#0d0f16',
            border: '1px solid #1a1d28',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#e5e7eb',
          }}
        >
          <span>Moderate Workload</span>
          <span style={{ color: '#374151' }}>•</span>
          <span>Low Fatigue</span>
          <span style={{ color: '#374151' }}>•</span>
          <span style={{ color: '#10b981' }}>High Engagement</span>
        </div>

        <button
          onClick={onExit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid #232738',
            borderRadius: '6px',
            color: '#9ca3af',
            fontSize: '0.8rem',
            cursor: 'pointer',
            marginTop: '1.5rem',
          }}
        >
          <Minimize2 size={13} />
          <span>Exit Focus Mode (Esc)</span>
        </button>
      </div>
    </div>
  );
};
