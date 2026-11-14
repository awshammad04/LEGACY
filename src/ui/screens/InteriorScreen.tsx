import { useEffect } from 'react';
import { getMission } from '../../content/missions';
import { interiorFor, interiorStoryId } from '../../content/interior';
import { replayStory } from './StoryCard';
import { useGame, useT, useUi } from '../../game/store';
import { examineInterior } from '../../game/interior';
import { sfx } from '../../game/audio';
import { ChoiceCard } from '../ChoiceCard';

/** Three optional teaching moments; uses the cabin and Mission 01's feedback interface. */
export function InteriorScreen() {
  const t=useT(),state=useGame(s=>s.state)!,missionId=useGame(s=>s.missionId)!,dispatch=useGame(s=>s.dispatch);
  const config=interiorFor(missionId),interior=state.interior!,topic=config.topics[interior.index];
  const crewed=getMission(missionId).type==='crewed',picked=topic?interior.answers[topic.id]??null:null;
  const choose=(optionId:string)=>{if(!topic||picked)return;sfx(optionId==='best'?'success':'select');dispatch({type:'INTERIOR_ANSWER',topicId:topic.id,optionId});};
  const next=()=>dispatch({type:'INTERIOR_NEXT'});
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes((e.target as HTMLElement)?.tagName)||useUi.getState().learnCard||useUi.getState().settingsOpen)return;
      if(e.key==='Enter'&&picked){e.preventDefault();next();}
      else if(topic&&!picked&&['1','2'].includes(e.key)){e.preventDefault();choose(topic.options[Number(e.key)-1].id);}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  return <main className="stage-body cruise-hud interior-hud" id="main" data-mission={missionId} data-virtual={!crewed}>
    <nav className="interior-views panel row-wrap" aria-label={t('Cabin views')}>
      {(['console','earth','destination'] as const).map(view=><button className="btn btn-sm" key={view} aria-pressed={(interior.view??'console')===view} onClick={()=>dispatch({type:'INTERIOR_VIEW',view})}>{t(view==='console'?'Forward console':view==='earth'?'Earth window':config.destination==='mars'?'Mars window':config.destination==='moon'?'Moon window':'Starfield window')}</button>)}
    </nav>
    <section className="interior-context panel fade-in stack-sm" aria-labelledby="interior-title">
      <span className="eyebrow">{t(crewed?'Spacecraft orientation':'Virtual engineering view — uncrewed mission')}</span>
      <h2 id="interior-title">{t('Explore inside the spacecraft')}</h2>
      <button className="btn btn-sm btn-ghost" aria-label={t('Skip orientation')} onClick={()=>dispatch({type:'FINISH_INTERIOR',skip:true})}>{t('Skip orientation')} →</button>
      <p className="small muted">{t(crewed?'An illustrative cabin tour. Your original life-aboard decisions follow later.':'A virtual training environment, not a reconstruction of this robotic spacecraft. No astronauts are aboard.')}</p>
      <p className="tiny dim">{t(config.destination==='mars'?'Earth and Mars through the windows — illustrative scale.':config.destination==='moon'?'Earth and the Moon through the windows — illustrative scale.':'Earth and the starfield — observing a galaxy does not mean traveling to it.')}</p>
      <p className="small">{t('Drag the open cabin view to look around. Select a glowing equipment marker or use the buttons below.')}</p>
      <div className="stack-sm">{config.topics.map((item,i)=><button className="btn btn-sm" key={item.id} onClick={()=>examineInterior(item.id)}><span aria-hidden="true">{interior.examined.includes(item.id)?'✓':i+1}</span>{t(item.title)}</button>)}</div>
    </section>
    <section className="cruise-card interior-question" aria-label={t('Post-launch practice')}>
      <div className="panel panel-pad stack fade-in" key={topic?.id??'done'}>
        <span className="eyebrow">{t('Practice only — separate from your knowledge assessments')}</span>
        {topic?<><span className="tiny dim">{t('Question {n} of {total}',{n:interior.index+1,total:config.topics.length})}</span><ChoiceCard step={topic} picked={picked} onChoose={choose} onContinue={next} onExplain={()=>replayStory(interiorStoryId(missionId,topic.id))} /></>:<>
          <h3>{t('Ready for mission operations')}</h3><p className="small muted">{t('Your equipment and resources are unchanged. Continue with your mission plan.')}</p>
          <button className="btn btn-primary" aria-label={t('Continue to mission operations')} onClick={()=>dispatch({type:'FINISH_INTERIOR'})}>{t('Continue to mission operations')} →</button>
        </>}
      </div>
    </section>
  </main>;
}
