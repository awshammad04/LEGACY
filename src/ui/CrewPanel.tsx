import type { CrewMember, CrewVitals, LText } from '../core/types';
import { useT } from '../game/store';

/** Simulated, educational crew-health values — never real medical data or diagnoses. */
export type CrewStatus = 'normal' | 'attention' | 'action';

export function crewStatus(v: CrewVitals): CrewStatus {
  if (v.fatigue >= 75 || v.hydration < 40 || v.doseMSv >= 40) return 'action';
  if (v.fatigue >= 50 || v.hydration < 60 || v.doseMSv >= 15 || v.sleepDebtH >= 3) return 'attention';
  return 'normal';
}

const STATUS_LABEL: Record<CrewStatus, LText> = {
  normal: { en: 'Normal' },
  attention: { en: 'Needs attention' },
  action: { en: 'Action required' },
};

export function StatusChip({ v }: { v: CrewVitals }) {
  const t = useT();
  const st = crewStatus(v);
  return <span className={`badge status-${st}`}>{st === 'normal' ? '●' : st === 'attention' ? '▲' : '■'} {t(STATUS_LABEL[st])}</span>;
}

function Bar({ label, value, max = 100, good = 'high', unit = '%' }: { label: string; value: number; max?: number; good?: 'high' | 'low'; unit?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const ok = good === 'high' ? pct >= 60 : pct <= 40;
  const mid = good === 'high' ? pct >= 40 : pct <= 65;
  return (
    <div className="crew-bar">
      <span className="tiny">{label}</span>
      <span className="meter-track" style={{ height: 6 }}>
        <span className={`meter-fill ${ok ? 'good' : mid ? 'warn' : 'bad'}`} style={{ width: `${pct}%`, display: 'block' }} />
      </span>
      <span className="tiny mono">
        {Math.round(value)}
        {unit}
      </span>
    </div>
  );
}

export function CrewPanel({ crew, vitals, compact = false }: { crew: CrewMember[]; vitals: CrewVitals; compact?: boolean }) {
  const t = useT();
  return (
    <div className="stack-sm">
      <div className="row between">
        <h4>🩺 {t('Crew health')}</h4>
        <StatusChip v={vitals} />
      </div>
      <div className={compact ? 'stack-sm' : 'crew-grid'}>
        {crew.map((c, i) => {
          const hr = Math.round(62 + vitals.fatigue * 0.22 + vitals.stress * 0.18 + i * 3);
          const spo2 = 98 - (vitals.hydration < 50 ? 2 : vitals.hydration < 70 ? 1 : 0);
          return (
            <div key={c.id} className="crew-card">
              <div className="row between small">
                <strong>{c.name}</strong>
                <span className="tiny dim">{t(c.role)}</span>
              </div>
              <div className="row between tiny">
                <span>❤ {hr} {t('bpm')}</span>
                <span>O₂ {spo2}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <Bar label={t('Fatigue')} value={vitals.fatigue} good="low" />
      <Bar label={t('Water')} value={vitals.hydration} />
      <Bar label={t('Fitness')} value={vitals.fitness} />
      <Bar label={t('Stress')} value={vitals.stress} good="low" />
      <Bar label={t('Radiation dose')} value={vitals.doseMSv} max={50} good="low" unit=" mSv" />
      <Bar label={t('Sleep debt')} value={vitals.sleepDebtH} max={8} good="low" unit=" h" />
      <span className="tiny dim">{t('Simulated educational values — not real astronaut data or medical advice.')}</span>
    </div>
  );
}
