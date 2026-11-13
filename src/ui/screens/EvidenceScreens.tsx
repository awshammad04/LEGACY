import { useEffect, useMemo, useState } from 'react';
import { getMission } from '../../content/missions';
import { computeMetrics } from '../../core/evaluate';
import { downlinkCapacityMb, evidenceBoard, observationAvailability, observationDataMb, observationPowerW, type SupportLevel } from '../../core/science';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';
import { fmtNum } from '../../game/i18n';
import { Modal, ProvenanceBadge, openLearnCard } from '../common';
import { Figure } from '../Figure';
import { OpsHud } from './SurfaceScreen';

const LEVEL: Record<SupportLevel, { label: string; pct: number; color: string }> = {
  'not-assessed': { label: 'Not yet tested', pct: 4, color: '#56607a' },
  weakened: { label: 'Weakened', pct: 12, color: '#ff6b6b' },
  consistent: { label: 'Consistent with data', pct: 40, color: '#ffb547' },
  supported: { label: 'Supported (not proven)', pct: 68, color: '#5ad1ff' },
  'strongly-supported': { label: 'Well supported (still not proven)', pct: 88, color: '#4ade80' },
};

const OBS_IMAGE: Record<string, { file: string; alt: string }> = {
  'obs-context': { file: 'assets/img/cheyava-falls.jpg', alt: 'Real Perseverance image of the Cheyava Falls rock with leopard spots.' },
  'obs-xrf': { file: 'assets/img/pixl-mineral-map.jpg', alt: 'Real PIXL mineral map showing vivianite and greigite in the Cheyava Falls sample.' },
  'obs-cache': { file: 'assets/img/sapphire-canyon-core.jpg', alt: "Real Mastcam-Z image of the Sapphire Canyon core in Perseverance's drill bit." },
};

export function EvidenceBoard() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const mission = getMission(missionId);
  const board = evidenceBoard(mission, state);
  return (
    <div className="stack-sm" aria-labelledby="board-title">
      <div className="row between">
        <h3 id="board-title">{t('Evidence board')}</h3>
        <ProvenanceBadge p="calculated" />
      </div>
      {mission.hypotheses.map((h) => {
        const b = board[h.id];
        const L = LEVEL[b.level];
        return (
          <div key={h.id} className="stack-sm">
            <div className="row between small">
              <span>
                {t(h.name)}
                {state.sciencePriority === h.id && <span className="pill" style={{ marginInlineStart: 6 }}>{t('your priority')}</span>}
              </span>
              <span style={{ color: L.color }}>{t(L.label)}</span>
            </div>
            <div className="ev-bar" role="img" aria-label={`${t(h.name)}: ${t(L.label)}`}>
              <span style={{ width: `${L.pct}%`, background: L.color }} />
            </div>
          </div>
        );
      })}
      <span className="tiny dim">{t('No rover measurement can mark a hypothesis "proven". Independent lines of evidence raise or lower support.')}</span>
    </div>
  );
}

export function EvidenceScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const n = (v: number, d = 0) => fmtNum(v, lang, d);
  const needAlert = state.evidence.alertShown && !state.evidence.alertChoice;
  const [explain, setExplain] = useState<string | null>(null);

  useEffect(() => {
    if (state.evidence.observations.length === 0) say({ en: 'You are at the rock. Each measurement costs time, energy and data. Choose them like a scientist: which ones can actually test your hypotheses?' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (needAlert) {
      sfx('alert');
      say({ en: 'Possible biosignature? Further investigation required.' }, { en: 'Science Team' });
    }
  }, [needAlert]);

  const choose = (c: 'announce' | 'gather' | 'cautious') => {
    dispatch({ type: 'ALERT_CHOICE', choice: c });
    if (c === 'announce') {
      sfx('warn');
      setExplain(t('Mission Control: "Hold on, Commander. One chemical pattern is a potential biosignature, not proof of life. Non-biological chemistry can produce similar minerals. An announcement now would overstate what the data show." This choice is recorded in your decision timeline.'));
    } else if (c === 'cautious') {
      sfx('confirm');
      say({ en: 'Good call. A cautious interpretation that lists alternatives is how careful scientists report.' });
      dispatch({ type: 'ADVANCE', to: 'report' });
    } else {
      sfx('confirm');
      say({ en: 'Agreed. Independent measurements will make the interpretation stronger.' });
    }
  };

  const done = [...state.evidence.observations].reverse();
  return (
    <main className="stage-body" id="main">
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="obs-title">
        <span className="eyebrow">{t('On Mars — analyze the evidence')}</span>
        <h2 id="obs-title">{t('Choose measurements')}</h2>
        <p className="small muted">{t('Only instruments you built on Earth can be used. Missing instruments mean missing information — never a made-up result.')}</p>
        {mission.observations.map((o) => {
          const av = observationAvailability(mission, state, m, o);
          const isDone = !av.ok && av.reason === 'done';
          const energy = o.hours * observationPowerW(mission, state.design, o);
          return (
            <div key={o.id} className="slot stack-sm" style={{ opacity: av.ok || isDone ? 1 : 0.55 }}>
              <div className="row between">
                <h4>{t(o.name)}</h4>
                {isDone ? <span className="ok small">✓ {t('done')}</span> : null}
              </div>
              <span className="tiny muted">{t(o.description)}</span>
              {av.ok ? (
                <div className="row between">
                  <span className="tiny mono dim">
                    {n(o.hours, 1)} h · {n(energy)} Wh · {n(observationDataMb(mission, state.design, o))} MB
                  </span>
                  <button className="btn btn-sm btn-primary" disabled={needAlert} onClick={() => (sfx('select'), dispatch({ type: 'RUN_OBSERVATION', observationId: o.id }))}>
                    {t('Run')}
                  </button>
                </div>
              ) : !isDone ? (
                <span className="tiny warn">{av.reason === 'disabled' ? t('Offline after an earlier decision.') : t('Not possible — this rover lacks the instrument.')}</span>
              ) : null}
              {o.learnCardId && (
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => openLearnCard(mission.learnCards.find((c) => c.id === o.learnCardId))}>
                  ⓘ {t('Real instrument behind it')}
                </button>
              )}
            </div>
          );
        })}
      </section>
      <section className="center-col">
        <OpsHud />
      </section>
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="board-title">
        <EvidenceBoard />
        <div className="divider" />
        <h3>{t('Findings')}</h3>
        {done.length === 0 && <p className="small dim">{t('No measurements yet.')}</p>}
        {done.map((r) => {
          const o = mission.observations.find((x) => x.id === r.id)!;
          const img = OBS_IMAGE[r.id];
          return (
            <div key={r.id} className="finding stack-sm fade-in">
              <div className="row between">
                <strong className="small">{t(o.name)}</strong>
                <span className={`pill ${r.quality === 'low' ? 'warn' : ''}`}>{t('Quality: {q}', { q: t(r.quality) })}</span>
              </div>
              <p className="small">{t(r.quality === 'low' && o.findingLow ? o.findingLow : o.finding)}</p>
              {img && r.quality !== 'low' && (
                <>
                  <Figure file={img.file} alt={t(img.alt)} maxHeight={170} />
                  <span className="tiny dim">{t('Real NASA Perseverance image for comparison. Your mission and its results are a fictional simulation.')}</span>
                </>
              )}
            </div>
          );
        })}
        <button className="btn btn-primary" disabled={state.evidence.observations.length === 0 || needAlert} onClick={() => (sfx('confirm'), dispatch({ type: 'ADVANCE', to: 'report' }))}>
          {t('Write the science report')} →
        </button>
      </section>

      {needAlert && (
        <Modal labelledBy="alert-title">
          <div className="stack">
            <span className="eyebrow" style={{ color: 'var(--amber)' }}>
              ⚠ {t('Science Team alert')}
            </span>
            <h2 id="alert-title">{t('Possible biosignature? Further investigation required.')}</h2>
            <p className="muted">{t('Your measurement shows a pattern that could be linked to ancient microbial activity. What will you do?')}</p>
            <div className="stack-sm">
              <button className="quiz-option" onClick={() => choose('announce')}>
                <strong>{t('Announce a discovery of life immediately')}</strong>
              </button>
              <button className="quiz-option" onClick={() => choose('gather')}>
                <strong>{t('Gather independent supporting measurements')}</strong>
              </button>
              <button className="quiz-option" onClick={() => choose('cautious')}>
                <strong>{t('Report a cautious interpretation and list alternative explanations')}</strong>
              </button>
            </div>
          </div>
        </Modal>
      )}
      {explain && (
        <Modal onClose={() => setExplain(null)} labelledBy="explain-title">
          <div className="stack">
            <h2 id="explain-title">{t('Evidence before certainty')}</h2>
            <p>{explain}</p>
            <button className="btn btn-primary" onClick={() => setExplain(null)}>
              {t('Understood')}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export function ReportScreen() {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const lang = useGame((s) => s.settings.lang);
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const cap = downlinkCapacityMb(mission, state, m);
  const [picked, setPicked] = useState<string[]>([]);
  const used = state.evidence.downlinked.reduce((a, id) => a + observationDataMb(mission, state.design, mission.observations.find((o) => o.id === id)!), 0);
  const n = (v: number) => fmtNum(v, lang);

  useEffect(() => {
    say({ en: 'Downlink capacity is limited. Scientists on Earth can only evaluate claims supported by data that actually reaches them.' });
  }, []);

  const toggleDown = (id: string) => {
    const cur = state.evidence.downlinked;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    const before = cur.length;
    dispatch({ type: 'SET_DOWNLINK', observationIds: next });
    const after = useGame.getState().state!.evidence.downlinked.length;
    if (!cur.includes(id) && after <= before) sfx('error');
    else sfx('click');
  };

  return (
    <main className="stage-body" id="main">
      <section className="side panel panel-pad stack scroll fade-in" aria-labelledby="dl-title">
        <span className="eyebrow">{t('Downlink to Earth')}</span>
        <h2 id="dl-title">{t('Choose what to send home')}</h2>
        <p className="small muted">{t('Capacity before solar conjunction: {c} MB, set by the communications system you chose on Earth.', { c: n(cap) })}</p>
        <div className="meter">
          <div className="meter-head">
            <span>{t('Downlink used')}</span>
            <span className="val">
              {n(used)} / {n(cap)} MB
            </span>
          </div>
          <div className="meter-track">
            <div className={`meter-fill ${used > cap * 0.9 ? 'warn' : ''}`} style={{ width: `${Math.min(100, (used / Math.max(1, cap)) * 100)}%` }} />
          </div>
        </div>
        <div className="stack-sm" role="group" aria-labelledby="dl-title">
          {state.evidence.observations.map((r) => {
            const o = mission.observations.find((x) => x.id === r.id)!;
            const on = state.evidence.downlinked.includes(r.id);
            return (
              <button key={r.id} className="check-row" role="checkbox" aria-checked={on} onClick={() => toggleDown(r.id)}>
                <span className="box" aria-hidden>
                  {on ? '✓' : ''}
                </span>
                <span className="grow">{t(o.name)}</span>
                <span className="mono tiny dim">{n(observationDataMb(mission, state.design, o))} MB</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="center-col" />
      <section className="side side-wide panel panel-pad stack scroll fade-in" aria-labelledby="rep-title">
        <span className="eyebrow">{t('Science report')}</span>
        <h2 id="rep-title">{t('Which statements will you send to Earth?')}</h2>
        <p className="small muted">{t('Select every statement your evidence supports. Claims need data that actually reached Earth.')}</p>
        <div className="stack-sm" role="group" aria-labelledby="rep-title">
          {mission.statements.map((st) => {
            const on = picked.includes(st.id);
            return (
              <button key={st.id} className="check-row" role="checkbox" aria-checked={on} onClick={() => (sfx('click'), setPicked(on ? picked.filter((x) => x !== st.id) : [...picked, st.id]))}>
                <span className="box" aria-hidden>
                  {on ? '✓' : ''}
                </span>
                <span className="grow small">{t(st.text)}</span>
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" disabled={picked.length === 0} onClick={() => (sfx('success'), dispatch({ type: 'SUBMIT_REPORT', statementIds: picked }))}>
          {t('Send report to Earth')} 📡
        </button>
      </section>
    </main>
  );
}
