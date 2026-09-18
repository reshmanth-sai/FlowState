import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface Props {
  onLaunchConsole: () => void;
  onNavigate: (route: 'platform' | 'pricing' | 'docs') => void;
}

export const PricingPage: React.FC<Props> = ({ onLaunchConsole, onNavigate }) => {
  const [annualBilling, setAnnualBilling] = useState(true);

  const proPrice = annualBilling ? 39 : 49;
  const enterprisePrice = annualBilling ? 399 : 499;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', paddingTop: '1.5rem' }}>
        <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>
          TRANSPARENT SCIENTIFIC & DEVELOPER ACCESS
        </span>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 700, letterSpacing: '-0.03em', marginTop: '0.4rem', marginBottom: '0.85rem' }}>
          Predictable Infrastructure Pricing.
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Whether you are an individual developer testing adaptive UI interactions, an academic lab running multi-subject protocols, or an enterprise engineering team, Flowstate provides deterministic, audited cognitive infrastructure.
        </p>

        {/* Billing Cycle Switcher */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'var(--bay-surface)',
          border: '1px solid var(--border-hairline-bright)',
          borderRadius: '20px',
          padding: '2px 4px',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={() => setAnnualBilling(false)}
            style={{
              background: !annualBilling ? 'var(--bay-elevated)' : 'transparent',
              color: !annualBilling ? 'var(--text-main)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setAnnualBilling(true)}
            style={{
              background: annualBilling ? 'var(--laser-violet)' : 'transparent',
              color: annualBilling ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Annual Billing</span>
            <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '8px' }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* 3 Main Tiers (Docked Hairline Grid, Zero Cards) */}
      <div className="dock-grid dock-grid-3" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Tier 1 */}
        <div className="bay-cell">
          <span className="mono-stamp">COMMUNITY / LOCAL</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 300, fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>
            $0
          </div>
          <p style={{ fontSize: '11.5px', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            Free and open-source local server. Zero cloud lock-in. Full access to sliding window pipeline and local SQLite storage.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '11px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Full Local Server & SQLite Storage</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Chrome Extension Ingestion</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Web Bluetooth (BLE) PPG Stream</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Deterministic Simulator (seed=42)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <XCircle size={12} color="var(--border-hairline-bright)" />
              <span>Multi-Subject Cohort Analytics</span>
            </div>
          </div>

          <button onClick={onLaunchConsole} className="btn-laser btn-laser-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            LAUNCH LOCAL CONSOLE
          </button>
        </div>

        {/* Tier 2 */}
        <div className="bay-cell" style={{ borderTop: '2px solid var(--laser-violet)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono-stamp" style={{ color: 'var(--laser-violet)' }}>RESEARCH PRO</span>
            <span className="tag tag-violet">RECOMMENDED</span>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 300, fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>
            ${proPrice} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ SEAT / MO</span>
          </div>
          <p style={{ fontSize: '11.5px', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            For HCI researchers, psychology labs, and design engineering teams requiring reproducible evaluations and verified dossiers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '11px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Everything in Community</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Cryptographic SHA-256 Audit Dossiers</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Phase 4 Evaluation Suite & Diff Matrix</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Multi-Session Timeline Comparison</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>PDF Paper Export & Academic Format</span>
            </div>
          </div>

          <button onClick={onLaunchConsole} className="btn-laser btn-laser-primary" style={{ width: '100%', justifyContent: 'center' }}>
            START 14-DAY RESEARCH TRIAL
          </button>
        </div>

        {/* Tier 3 */}
        <div className="bay-cell">
          <span className="mono-stamp">ENTERPRISE FLEET</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 300, fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>
            ${enterprisePrice} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ LAB / MO</span>
          </div>
          <p style={{ fontSize: '11.5px', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            For enterprise software teams, mission-critical operations, and research consortia requiring fleet-wide monitoring.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '11px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Unlimited Seats & Concurrent Sessions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Custom Hardware SDK Adapters (Empatica, Polar)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Self-Hosted VPC / Kubernetes Deployment</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={12} color="var(--phosphor-jade)" />
              <span>Dedicated Research Support & SLA</span>
            </div>
          </div>

          <button onClick={() => alert('Enterprise inquiry forwarded to research team.')} className="btn-laser btn-laser-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            CONTACT RESEARCH FLEET
          </button>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.5rem' }}>
          FREQUENTLY ASKED QUESTIONS
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-hairline)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-micro)' }}>
          <div className="bay-cell">
            <h4 style={{ fontSize: '12px', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
              Do I need a physical smartwatch or wearable to use Flowstate?
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              No. Flowstate features a standalone behavioral telemetry layer that estimates cognitive demand from typing cadence, response latencies, and interaction rhythm. Furthermore, the built-in deterministic simulator (seed=42) allows full exploration of multimodal pipelines without hardware.
            </p>
          </div>

          <div className="bay-cell">
            <h4 style={{ fontSize: '12px', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
              Does Flowstate record my source code, page text, or microphone?
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Strictly no. Flowstate operates under a verified zero-DOM-scraping policy. The Chrome extension only measures event timing intervals (e.g. median keystroke delays). It never accesses code editors, page text, clipboard contents, webcam, or microphone.
            </p>
          </div>

          <div className="bay-cell">
            <h4 style={{ fontSize: '12px', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
              Are academic discounts available?
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Yes. Accredited university researchers, graduate students, and non-profit HCI research labs qualify for 50% academic grants on Research Pro tiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
