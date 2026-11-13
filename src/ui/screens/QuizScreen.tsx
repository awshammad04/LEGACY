import { useMemo, useRef, useState } from 'react';
import { getMission } from '../../content/missions';
import { shuffledOptions } from '../../core/quizEngine';
import { useGame, useT } from '../../game/store';
import { say, sfx } from '../../game/audio';

export function QuizScreen({ mode }: { mode: 'pre' | 'post' }) {
  const t = useT();
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const dispatch = useGame((s) => s.dispatch);
  const mission = getMission(missionId);
  const questions = mode === 'pre' ? mission.quizPre : mission.quizPost;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmSkip, setConfirmSkip] = useState(false);
  const advancing = useRef(false);
  const q = questions[idx];
  const options = useMemo(() => shuffledOptions(q, state.seed + (mode === 'post' ? 7 : 0)), [q, state.seed, mode]);
  const chosen = answers[q.id];
  const last = idx === questions.length - 1;

  const submit = (ans: Record<string, string> = answers) => {
    sfx('confirm');
    if (mode === 'pre') {
      dispatch({ type: 'ANSWER_PRE_QUIZ', answers: ans });
      say({ en: 'Baseline saved. Your decisions will help you discover the answers.' });
    } else {
      dispatch({ type: 'ANSWER_POST_QUIZ', answers: ans });
    }
  };

  return (
    <main className="centered" id="main">
      <div className="panel panel-pad content-card stack fade-in" style={{ maxWidth: 760 }}>
        <div className="row between">
          <span className="eyebrow">{mode === 'pre' ? t('Before you launch — knowledge check') : t('Final knowledge check')}</span>
          <div className="progress-dots" role="img" aria-label={t('Question {n} of {total}', { n: idx + 1, total: questions.length })}>
            {questions.map((x, i) => (
              <span key={x.id} className={i <= idx ? 'on' : ''} />
            ))}
          </div>
        </div>
        <p className="small muted">
          {mode === 'pre'
            ? t('3 quick questions before you start. No pass or fail — just tap an answer.')
            : t('Three new questions on the same ideas. Your answers are compared only with what you actually answered at the start.')}
        </p>
        <div className="stack-sm">
          <span className="tiny dim">
            {t('Question {n} of {total}', { n: idx + 1, total: questions.length })} · {t(q.conceptLabel)}
          </span>
          <h2 id="q-prompt" style={{ fontSize: 21 }}>
            {t(q.prompt)}
          </h2>
        </div>
        <div className="stack-sm" role="radiogroup" aria-labelledby="q-prompt">
          {options.map((o, i) => (
            <button
              key={o.id}
              className="quiz-option"
              role="radio"
              aria-checked={chosen === o.id}
              onClick={() => {
                if (advancing.current) return;
                advancing.current = true;
                sfx('click');
                const next = { ...answers, [q.id]: o.id };
                setAnswers(next);
                setTimeout(() => {
                  advancing.current = false;
                  if (last) submit(next);
                  else setIdx((i) => Math.min(i + 1, questions.length - 1));
                }, 420);
              }}
            >
              <span className="letter" aria-hidden>
                {String.fromCharCode(65 + i)}
              </span>
              <span>{t(o.text)}</span>
            </button>
          ))}
        </div>
        <div className="row between">
          <div className="row">
            {idx > 0 && (
              <button className="btn btn-ghost" onClick={() => setIdx(idx - 1)}>
                {t('Back')}
              </button>
            )}
            {mode === 'pre' && !confirmSkip && (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmSkip(true)}>
                {t('Skip check (accessible mode)')}
              </button>
            )}
          </div>
          <span className="tiny dim">{t('Tap an answer to continue')}</span>
        </div>
        {confirmSkip && (
          <div className="feed-item warn stack-sm" role="alert">
            <span>{t('If you skip the knowledge check, no before/after learning comparison will be available for this mission.')}</span>
            <div className="row">
              <button className="btn btn-sm" onClick={() => dispatch({ type: 'SKIP_PRE_QUIZ' })}>
                {t('Skip anyway')}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirmSkip(false)}>
                {t('Answer the questions')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
