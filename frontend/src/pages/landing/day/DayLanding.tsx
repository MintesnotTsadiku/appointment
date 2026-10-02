import { MotionConfig } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import LandingHead from "../shared/LandingHead";
import { useEntryLinks } from "../shared/useEntryLinks";
import Chapter from "./components/Chapter";
import Finale from "./components/Finale";
import Prologue from "./components/Prologue";
import Rail from "./components/Rail";
import Sky from "./components/Sky";
import TopBar from "./components/TopBar";
import CareStage from "./stages/CareStage";
import DeskStage from "./stages/DeskStage";
import GrowStage from "./stages/GrowStage";
import InsightsStage from "./stages/InsightsStage";
import MovesStage from "./stages/MovesStage";
import SoloStage from "./stages/SoloStage";
import TeamStage from "./stages/TeamStage";
import { useDayClock } from "./useDayClock";
import { WORLDS } from "./world";
import "./landing.css";
import "./stages/stages.css";

/**
 * "A Day, Coordinated". Scrolling moves the story from before dawn to
 * midnight; every hour is a different kind of business.
 */
const DayLanding = () => {
  const { t } = useTranslation();
  const clock = useDayClock();
  const entry = useEntryLinks();
  const world = WORLDS[clock.index]?.id ?? "dawn";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lw" data-world={world} data-qa="landing-world">
        <LandingHead />
        <a className="lw-skip" href="#solo">{t("world.nav.skip")}</a>
        <Sky hour={clock.hour} />
        <TopBar hour={clock.hour} entry={entry} />
        <Rail index={clock.index} />
        <main className="lw-main">
          <Prologue entry={entry} />
          <Chapter id="solo"><SoloStage /></Chapter>
          <Chapter id="team" flip><TeamStage /></Chapter>
          <Chapter id="care"><CareStage /></Chapter>
          <Chapter id="desk" flip><DeskStage /></Chapter>
          <Chapter id="moves"><MovesStage /></Chapter>
          <Chapter id="insights" flip><InsightsStage /></Chapter>
          <Chapter id="grow"><GrowStage /></Chapter>
          <Finale entry={entry} />
        </main>
      </div>
    </MotionConfig>
  );
};

export default DayLanding;
