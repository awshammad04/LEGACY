import { useGame } from '../game/store';
import { QuizScreen } from './screens/QuizScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { ReviewScreen, WorkshopScreen } from './screens/WorkshopScreen';
import { LandingSiteScreen, LaunchScreen, OrbitScreen } from './screens/FlightScreens';
import { SurfaceScreen } from './screens/SurfaceScreen';
import { EvidenceScreen, ReportScreen } from './screens/EvidenceScreens';
import { DebriefScreen, ResultsScreen } from './screens/DebriefScreens';
import { OpsPreviewScreen } from './screens/OpsPreviewScreen';
import { ExploreHud } from './screens/ExploreHud';
import { getMission } from '../content/missions';

export function MissionScreens() {
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
      return <LaunchScreen />;
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
    default:
      return null;
  }
}
