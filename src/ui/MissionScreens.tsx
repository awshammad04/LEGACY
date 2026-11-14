import { useGame, useT } from '../game/store';
import { LaunchHud, type LaunchController } from '../launch';
import { proceedFromLaunch } from '../launch/legacyHost';
import { QuizScreen } from './screens/QuizScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { ReviewScreen, WorkshopScreen } from './screens/WorkshopScreen';
import { LandingSiteScreen, LaunchScreen, OrbitScreen } from './screens/FlightScreens';
import { SurfaceScreen } from './screens/SurfaceScreen';
import { EvidenceScreen, ReportScreen } from './screens/EvidenceScreens';
import { DebriefScreen, ResultsScreen } from './screens/DebriefScreens';
import { OpsPreviewScreen } from './screens/OpsPreviewScreen';
import { ExploreHud } from './screens/ExploreHud';
import { CruiseScreen } from './screens/CruiseScreen';
import { ObserveScreen } from './screens/ObserveScreen';
import { getMission } from '../content/missions';

export function MissionScreens({ launch }: { launch: LaunchController | null }) {
  const t = useT();
  const subtitles = useGame((s) => s.settings.subtitles);
  const stage = useGame((s) => s.state?.stage);
  const missionId = useGame((s) => s.missionId);
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
      return missionId === 'm3-lost-rover' ? launch && <LaunchHud launch={launch} subtitles={subtitles} translate={t} onRecover={proceedFromLaunch} /> : <LaunchScreen />;
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
    case 'observe':
      return <ObserveScreen />;
    default:
      return null;
  }
}
