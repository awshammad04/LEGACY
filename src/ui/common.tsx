import { useEffect, useRef, type ReactNode } from 'react';
import type { LearnCard, LText, Provenance } from '../core/types';
import { sourceById } from '../content/sources';
import { useGame, useT, useUi } from '../game/store';
import { sfx } from '../game/audio';

export function ProvenanceBadge({ p }: { p: Provenance }) {
  const t = useT();
  const label = p === 'verified' ? t('NASA source') : p === 'calculated' ? t('Calculated') : t('Game value');
  const icon = p === 'verified' ? '✓' : p === 'calculated' ? 'ƒ' : '✦';
  const title =
    p === 'verified'
      ? t('Verified historical or scientific information from a cited NASA source.')
      : p === 'calculated'
        ? t('Calculated by the simplified educational model from declared assumptions.')
        : t('Fictional game-balance value. Not a NASA figure.');
  return (
    <span className={`badge badge-${p}`} title={title}>
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

export function SourceLink({ id }: { id?: string }) {
  const t = useT();
  const s = sourceById(id);
  if (!s) return null;
  if (s.url.startsWith('#')) return <span className="tiny dim">{t('Source')}: {s.title}</span>;
  return (
    <a className="tiny" href={s.url} target="_blank" rel="noreferrer noopener">
      {t('Source')}: {s.credit} — {s.title} ↗
    </a>
  );
}

export function Meter({ label, value, max, display, mark, invert, status }: { label: string; value: number; max: number; display: string; mark?: number; invert?: boolean; status?: 'good' | 'warn' | 'bad' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  let st = status;
  if (!st) {
    const ratio = max > 0 ? value / max : 0;
    st = invert ? (ratio < 0.25 ? 'bad' : ratio < 0.5 ? 'warn' : 'good') : ratio > 1 ? 'bad' : ratio > 0.9 ? 'warn' : undefined;
  }
  return (
    <div className="meter" role="group" aria-label={`${label}: ${display}`}>
      <div className="meter-head">
        <span>{label}</span>
        <span className={`val ${st === 'bad' ? 'bad' : st === 'warn' ? 'warn' : ''}`}>{display}</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${st ?? ''}`} style={{ width: `${pct}%` }} />
        {mark !== undefined && max > 0 && <div className="meter-mark" style={{ insetInlineStart: `${Math.min(100, (mark / max) * 100)}%` }} />}
      </div>
    </div>
  );
}

export function Modal({ onClose, children, labelledBy, wide }: { onClose?: () => void; children: ReactNode; labelledBy?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`panel panel-pad modal fade-in ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

/** Point-to-Learn card: Name · What it is · What it does · Why it matters · Connection · Source */
export function LearnCardModal() {
  const card = useUi((s) => s.learnCard);
  const set = useUi((s) => s.set);
  const t = useT();
  if (!card) return null;
  const close = () => set({ learnCard: undefined });
  const rows: [string, LText][] = [
    [t('What it is'), card.what],
    [t('What it does'), card.does],
    [t('Why it matters'), card.why],
    [t('Connection to this mission'), card.connection],
  ];
  return (
    <Modal onClose={close} labelledBy="lc-title">
      <div className="modal-head">
        <div className="stack-sm">
          <span className="eyebrow">{t('Point to learn')}</span>
          <h2 id="lc-title">{t(card.name)}</h2>
        </div>
        <ProvenanceBadge p={card.provenance} />
      </div>
      <div className="stack" style={{ marginTop: 14 }}>
        {(card.compact?[rows[0],rows[3]]:rows).map(([k, v]) => (
          <div key={k} className="stack-sm">
            <h4 className="muted">{k}</h4>
            <p>{t(v)}</p>
          </div>
        ))}
        <SourceLink id={card.sourceId} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={close}>
            {t('Back to mission')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function openLearnCard(card: LearnCard | undefined) {
  if (!card) return;
  sfx('select');
  useUi.getState().set({ learnCard: card });
  useGame.getState().addDiscovery(card.id);
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="toggle">
      <div className="stack-sm">
        <span>{label}</span>
        {hint && <span className="tiny dim">{hint}</span>}
      </div>
      <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
    </div>
  );
}

export function money(n: number, t: ReturnType<typeof useT>) {
  return t('${n}M', { n: Math.round(n) });
}
