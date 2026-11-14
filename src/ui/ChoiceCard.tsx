import type { CruiseStep } from '../core/types';
import { useT } from '../game/store';
import { BestChoiceNote } from './screens/ExploreHud';

/** Mission 01's choice, answer feedback and explanation interface, shared with orientation. */
export function ChoiceCard({step,picked,onChoose,onContinue,onExplain}: {
  step:Pick<CruiseStep,'title'|'prompt'|'learn'|'options'|'best'>;picked:string|null;
  onChoose:(id:string)=>void;onContinue:()=>void;onExplain?:()=>void;
}) {
  const t=useT(), selected=step.options.find(o=>o.id===picked), best=step.options.find(o=>o.id===(step.best??step.options[0].id))!;
  return <>
    <h3 id="step-t" style={{fontSize:20}}>{t(step.title)}</h3><p>{t(step.prompt)}</p>
    {selected?<div className="stack-sm">
      <div className={`feed-item ${selected.unsafe?'bad':''}`} role="status">{t(selected.result)}</div>
      <BestChoiceNote best={selected.id===best.id} label={t(best.label)} why={t(step.learn)} />
      {onExplain&&<button className="btn btn-sm" onClick={onExplain}>{t('Listen to the explanation')}</button>}
      <button className="btn btn-primary" onClick={onContinue} aria-label={t('Continue')} autoFocus>{t('Continue')} →</button>
    </div>:<div className="stack-sm">{step.options.map((o,i)=><button key={o.id} className="action-row" onClick={()=>onChoose(o.id)}><span className="key">{i+1}</span><span className="grow">{t(o.label)}</span></button>)}</div>}
  </>;
}
