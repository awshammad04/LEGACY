import { useGame, useT } from '../game/store';
import { LaunchHud, type LaunchController } from '../launch';
import { proceedFromLaunch } from '../launch/legacyHost';
import { LAUNCH_MISSIONS } from '../launch/missions';
import { QuizScreen } from './screens/QuizScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { ReviewScreen, WorkshopScreen } from './screens/WorkshopScreen';
import { LandingSiteScreen, OrbitScreen } from './screens/FlightScreens';
import { SurfaceScreen } from './screens/SurfaceScreen';
import { EvidenceScreen, ReportScreen } from './screens/EvidenceScreens';
import { DebriefScreen, ResultsScreen } from './screens/DebriefScreens';
import { OpsPreviewScreen } from './screens/OpsPreviewScreen';
import { ExploreHud } from './screens/ExploreHud';
import { CruiseScreen } from './screens/CruiseScreen';
import { InteriorScreen } from './screens/InteriorScreen';
import { ObserveScreen } from './screens/ObserveScreen';
import { getMission } from '../content/missions';

export function MissionScreens({ launch }: { launch: LaunchController | null }) {
  const t = useT();
  const subtitles = useGame((s) => s.settings.subtitles);
  const stage = useGame((s) => s.state?.stage);
  const missionId = useGame((s) => s.missionId);
  const seed = useGame((s) => s.seed);
  switch (stage) {
    case 'quizPre':
      return <QuizScreen key="pre" mode="pre" />;
    case 'briefing':
      return <BriefingScreen />;
    case 'workshop':
      return <WorkshopScreen />;
    case 'review':
      return <ReviewScreen />;
    case 'launch':
      return launch && missionId && <LaunchHud key={`${missionId}:${seed}`} launch={launch} identity={LAUNCH_MISSIONS[missionId]}
        subtitles={subtitles} translate={t} onRecover={() => proceedFromLaunch(missionId, seed)} />;
    case 'orbit':
      return <OrbitScreen />;
    case 'landingSite':
      return <LandingSiteScreen />;
    case 'surface':
      return missionId && getMission(missionId).sites ? <ExploreHud /> : <SurfaceScreen />;
    case 'evidence':
      return <EvidenceScreen />;
    case 'report':
      return <ReportScreen />;
    case 'debrief':
      return <DebriefScreen />;
    case 'quizPost':
      return <QuizScreen key="post" mode="post" />;
    case 'results':
      return <ResultsScreen />;
    case 'opsPreview':
      return <OpsPreviewScreen />;
    case 'cruise':
      return <CruiseScreen />;
    case 'interior':
      return <InteriorScreen />;
    case 'observe':
      return <ObserveScreen />;
    default:
      return null;
  }
}
