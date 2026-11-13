import { useEffect, useMemo, useState } from 'react';
import type { Action, DecisionEntry, MissionState } from '../../core/types';
import { getMission } from '../../content/missions';
import { gradeReport } from '../../core/science';
import { whatIfDesign, type WhatIfResult } from '../../core/reducer';
import { compareQuizzes } from '../../core/quizEngine';
import { ACHIEVEMENTS } from '../../core/outcome';
import { useGame, useT, useUi } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { fmtNum } from '../../game/i18n';
import { ProvenanceBadge } from '../common';

const TIER: Record<string, { label: string; cls: string; text: string }> = {
  exemplary: { label: 'Exemplary investigation', cls: 'ok', text: 'Valuable science, safely done, honestly reported.' },
  solid: { label: 'Solid investigation', cls: 'ok', text: 'Useful results with room to improve.' },
  incomplete: { label: 'Incomplete investigation', cls: 'warn', text: 'Important evidence was missing or never reached Earth.' },
  compromised: { label: 'Mission compromised', cls: 'bad', text: 'Safety problems or unsupported claims undermined the mission.' },
};

const KIND_COLOR: Record<DecisionEntry['kind'], string> = { design: '#9b8cff', operation: '#5ad1ff', event: '#ffb547', science: '#4ade80', safety: '#ff6b6b', quiz: '#a9b6d3' };

function OutcomeTable({ a, b }: { a: MissionState; b?: MissionState }) {
  const t = useT();
  const lang = useGame((s) => s.settings.lang);
  const n = (v: number, d = 0) => fmtNum(v, lang, d);
  const mission = getMission(a.missionId);
  const site = (s: MissionState) => t(mission.landingSites.find((x) => x.id === s.landingSite)?.name ?? '—');
  const rows: [string, (s: MissionState) => string][] = [
    [t('Outcome'), (s) => t(TIER[s.outcome?.tier ?? 'incomplete'].label)],
    [t('Landing site'), site],
    [t('Reached the rock'), (s) => (s.ops.arrived ? t('Yes') : t('No'))],
    [t('Sols used'), (s) => n(s.ops.sol, 1)],
    [t('Battery capacity left'), (s) => `${n(s.outcome?.energyMarginPct ?? 0)}%`],
    [t('Measurements made'), (s) => n(s.evidence.observations.length)],
    [t('Data products sent to Earth'), (s) => n(s.evidence.downlinked.length)],
    [t('Science score'), (s) => n(s.outcome?.scienceScore ?? 0)],
    [t('Report score'), (s) => n(s.outcome?.reportScore ?? 0)],
    [t('Safety issues'), (s) => n(s.outcome?.safetyIssues ?? 0)],
  ];
  return (
    <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr className="dim tiny">
          <th style={{ textAlign: 'start', padding: 4 }} />
          <th style={{ textAlign: 'start', padding: 4 }}>{b ? t('Your mission') : t('Result')}</th>
          {b && <th style={{ textAlign: 'start', padding: 4 }}>{t('What-If')}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, f]) => (
          <tr key={k} style={{ borderTop: '1px solid var(--line)' }}>
            <td className="muted" style={{ padding: 4 }}>{k}</td>
            <td className="mono" style={{ padding: 4 }}>{f(a)}</td>
            {b && (
              <td className="mono" style={{ padding: 4, color: f(a) !== f(b) ? 'var(--cyan)' : undefined }}>
                {f(b)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const WHATIF_SLOTS = ['power', 'camera', 'comms', 'edl', 'chassis', 'protection'];

function WhatIfMachine() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const actions = useGame((s) => s.actions);
  const seed = useGame((s) => s.seed);
  const mission = getMission(missionId);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [addons, setAddons] = useState<string[]>(state.design.addons);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const instruments = mission.slots.find((s) => s.id === 'instruments')!;

  const run = () => {
    const acts: Action[] = Object.entries(changes)
      .filter(([slot, id]) => state.design.selections[slot] !== id)
      .map(([slot, optionId]) => ({ type: 'SELECT_COMPONENT', slot, optionId }));
    for (const o of instruments.options) {
      const had = state.design.addons.includes(o.id);
      const want = addons.includes(o.id);
      if (had !== want) acts.push({ type: 'TOGGLE_ADDON', optionId: o.id });
    }
    sfx('uplink');
    setResult(whatIfDesign(mission, seed, actions, acts));
  };

  return (
    <div className="stack">
      <p className="small muted">{t('Change your Earth design and re-run the same rules. Every later decision you made is replayed; decisions that no longer make sense are skipped. Nothing here is prewritten — the outcome is recomputed.')}</p>
      <div className="addon-grid">
        {WHATIF_SLOTS.map((slotId) => {
          const slot = mission.slots.find((s) => s.id === slotId)!;
          const cur = changes[slotId] ?? state.design.selections[slotId];
          return (
            <label key={slotId} className="stack-sm small">
              <span className="muted">{t(slot.name)}</span>
              <select value={cur} onChange={(e) => setChanges({ ...changes, [slotId]: e.target.value })} style={{ background: 'var(--panel-solid)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '6px 8px' }}>
                {slot.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {t(o.name)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className="row-wrap">
        {instruments.options.map((o) => {
          const on = addons.includes(o.id);
          return (
            <button key={o.id} className="btn btn-sm" aria-pressed={on} style={on ? { borderColor: 'var(--cyan)' } : { opacity: 0.6 }} onClick={() => setAddons(on ? addons.filter((x) => x !== o.id) : [...addons, o.id])}>
              {on ? '☑' : '☐'} {t(o.name)}
            </button>
          );
        })}
      </div>
      <button className="btn btn-primary" onClick={run} style={{ alignSelf: 'flex-start' }}>
        ⟲ {t('Re-run mission with this design')}
      </button>
      {result && !result.passedReview && (
        <div className="feed-item bad small stack-sm" role="status">
          <strong>{t('This design would not pass the Pre-Launch Readiness Review:')}</strong>
          {result.failures.map((f, i) => (
            <span key={i}>• {t(f)}</span>
          ))}
        </div>
      )}
      {result && result.passedReview && (
        <div className="stack-sm fade-in" role="status">
          <OutcomeTable a={result.original} b={result.alternative} />
          {result.alternative.flags.notes.map((nt, i) => (
            <span key={i} className="tiny warn">
              • {t(nt)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function DebriefScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const actions = useGame((s) => s.actions);
  const dispatch = useGame((s) => s.dispatch);
  const restore = useGame((s) => s.restoreActions);
  const mission = getMission(missionId);
  const outcome = state.outcome!;
  const tier = TIER[outcome.tier];
  const grade = useMemo(() => gradeReport(mission, state.evidence.report ?? [], state.evidence.downlinked), [mission, state.evidence]);
  const [tab, setTab] = useState<'timeline' | 'whatif' | 'report'>('timeline');

  useEffect(() => {
    sfx(outcome.tier === 'exemplary' || outcome.tier === 'solid' ? 'success' : 'warn');
    say({ en: 'Mission debrief. Every decision left a mark. Let us look at what happened — and what could have happened.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replayFrom = (e: DecisionEntry) => {
    if (!window.confirm(t('Replay from this decision? Everything after it will be replaced by your new choices.'))) return;
    const prefix = actions.slice(0, e.actionIndex);
    const extra: Action[] = actions[e.actionIndex]?.type === 'CONFIRM_LAUNCH' ? [{ type: 'ADVANCE', to: 'workshop' }] : [];
    useUi.getState().set({ waypoints: [], driving: false });
    restore([...prefix, ...extra]);
  };

  return (
    <main className="stage-body" id="main">
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="db-title">
        <span className="eyebrow">{t('Mission debrief')}</span>
        <h2 id="db-title" className={tier.cls}>
          {t(tier.label)}
        </h2>
        <p className="muted">{t(tier.text)}</p>
        <OutcomeTable a={state} />
        <div className="stack-sm">
          <h4>{t('Achievements')}</h4>
          {outcome.achievements.length === 0 && <span className="small dim">{t('None this time — try the What-If machine or replay a decision.')}</span>}
          {outcome.achievements.map((a) => (
            <div key={a} className="finding small">
              🏅 <strong>{t(ACHIEVEMENTS[a as keyof typeof ACHIEVEMENTS].en)}</strong> — {t(ACHIEVEMENTS[a as keyof typeof ACHIEVEMENTS].desc)}
            </div>
          ))}
          <span className="tiny dim">{t('Unsafe actions never earn an advantage, even when they produce dramatic results.')}</span>
        </div>
        {!outcome.beforeConjunction && <div className="feed-item warn small">{t('Solar conjunction began before the report: scientists on Earth received it late.')}</div>}
        <button className="btn btn-primary" onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: 'quizPost' }))}>
          {t('Take the final knowledge check')} →
        </button>
      </section>
      <section className="center-col" />
      <section className="side side-wide panel panel-pad stack scroll fade-in">
        <div className="seg" role="tablist" aria-label={t('Debrief views')} style={{ alignSelf: 'flex-start' }}>
          <button role="tab" aria-selected={tab === 'timeline'} aria-pressed={tab === 'timeline'} onClick={() => setTab('timeline')}>
            {t('Decision timeline')}
          </button>
          <button role="tab" aria-selected={tab === 'whatif'} aria-pressed={tab === 'whatif'} onClick={() => setTab('whatif')}>
            {t('What-If machine')}
          </button>
          <button role="tab" aria-selected={tab === 'report'} aria-pressed={tab === 'report'} onClick={() => setTab('report')}>
            {t('Report feedback')}
          </button>
        </div>
        {tab === 'timeline' && (
          <div className="timeline">
            {state.log.map((e, i) => (
              <div key={i} className="tl-item">
                <span className="tl-dot" style={{ background: KIND_COLOR[e.kind] }} />
                <div className="stack-sm">
                  <strong className="small">{t(e.title)}</strong>
                  <span className="tiny muted">{t(e.detail)}</span>
                </div>
                {e.checkpoint ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => replayFrom(e)} aria-label={`${t('Replay from here')}: ${t(e.title)}`}>
                    ⟲ {t('Replay from here')}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        )}
        {tab === 'whatif' && <WhatIfMachine />}
        {tab === 'report' && (
          <div className="stack-sm">
            <div className="row between">
              <h4>{t('How Earth scientists read your report')}</h4>
              <ProvenanceBadge p="calculated" />
            </div>
            {grade.perStatement.map((p) => {
              const st = mission.statements.find((s) => s.id === p.id)!;
              const cls = p.points > 0 ? 'ok' : 'bad';
              const verdict = { supported: 'Supported by downlinked data', unsupported: 'Not supported — the evidence never reached Earth', overclaim: 'Overclaim', dismissive: 'Dismisses real evidence', caution: 'Careful caveat' }[p.verdict];
              return (
                <div key={p.id} className="finding small stack-sm">
                  <span>“{t(st.text)}”</span>
                  <span className={cls}>
                    {t(verdict)} ({p.points > 0 ? '+' : ''}
                    {p.points})
                  </span>
                  <span className="tiny dim">{t(st.explanation)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const CONCEPT_REPLAY: Record<string, string> = {
  tradeoffs: 'Replay the Build Workshop: try a design that stays inside every limit with margin.',
  hazards: 'Replay the solar particle event and compare safe mode with ignoring the warning.',
  evidence: 'Replay the investigation and write a report that separates evidence from certainty.',
};

export function ResultsScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const setView = useGame((s) => s.setView);
  const startMission = useGame((s) => s.startMission);
  const mission = getMission(missionId);
  const post = state.quiz.post!;
  const cmp = compareQuizzes(state.quiz.pre, post);

  useEffect(() => {
    say({ en: 'Results recorded. Your Legacy Archive has new entries waiting.' });
  }, []);

  return (
    <main className="centered" id="main">
      <div className="panel panel-pad content-card stack fade-in" style={{ maxWidth: 900 }}>
        <span className="eyebrow">{t('Learning results')}</span>
        {cmp.available ? (
          <h2>
            {t('Before: {b}/{n} · After: {a}/{n}', { b: cmp.before ?? 0, a: cmp.after, n: cmp.total })}
          </h2>
        ) : (
          <>
            <h2>{t('Final check: {a}/{n}', { a: cmp.after, n: cmp.total })}</h2>
            <div className="feed-item warn small">{t('No before/after comparison is available because the starting knowledge check was skipped.')}</div>
          </>
        )}
        <p className="small muted">{t('These are your measured answers only. LEGACY never invents an improvement.')}</p>
        <div className="stack-sm">
          {mission.quizPost.map((q) => {
            const chosen = q.options.find((o) => o.id === post.answers[q.id]);
            const correct = q.options.find((o) => o.correct)!;
            const ok = !!chosen?.correct;
            const pre = state.quiz.pre?.perConcept[q.concept];
            return (
              <div key={q.id} className="finding stack-sm">
                <div className="row between">
                  <strong className="small">{t(q.conceptLabel)}</strong>
                  <span className={ok ? 'ok small' : 'warn small'}>
                    {cmp.available ? (pre ? t('Before: correct') : t('Before: not yet')) + ' → ' : ''}
                    {ok ? t('Now: correct') : t('Now: needs practice')}
                  </span>
                </div>
                <span className="small">{t(q.prompt)}</span>
                <span className="tiny muted">
                  {t('Your answer')}: {chosen ? t(chosen.text) : '—'}
                </span>
                {!ok && (
                  <span className="tiny">
                    {t('Best answer')}: {t(correct.text)}
                  </span>
                )}
                <span className="tiny dim">{t(q.explanation)}</span>
              </div>
            );
          })}
        </div>
        {cmp.needsPractice.length > 0 && (
          <div className="stack-sm">
            <h4>{t('Suggested replay')}</h4>
            {cmp.needsPractice.map((c) => (
              <span key={c} className="small">
                • {t(CONCEPT_REPLAY[c])}
              </span>
            ))}
          </div>
        )}
        <div className="stack-sm">
          <h4>{t('Unlocked in your Legacy Archive')}</h4>
          <div className="row-wrap">
            {mission.archive
              .filter((a) => state.archiveUnlocked.includes(a.id))
              .map((a) => (
                <button key={a.id} className="btn btn-sm" onClick={() => (setView('archive'), useUi.getState().set({ archiveEntry: a.id }))}>
                  📜 {t(a.title)}
                </button>
              ))}
          </div>
        </div>
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => startMission(missionId)}>
            ⟲ {t('Replay mission')}
          </button>
          <button className="btn" onClick={() => setView('archive')}>
            {t('Open the Legacy Archive')}
          </button>
          <button className="btn btn-primary" onClick={() => setView('home')}>
            {t('Back to Mission Control')}
          </button>
        </div>
      </div>
    </main>
  );
}
