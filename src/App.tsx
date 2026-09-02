import "./App.css";
import { Layout } from "./components/layout";
import { HeaderSection } from "./containers/HeaderSection";
import { InfoSection } from "./containers/InfoSection";
import { GameScreen } from "./containers/GameScreen";
import { LaunchGate } from "./containers/LaunchGate";
import { FreeBetCompleted } from "./components/ui/FreeBetCompleted";
import { ModalProvider } from "./context/ModalProvider";
import { GameProvider } from "./context/GameProvider";

function App() {
  return (
    <LaunchGate>
      <GameProvider>
        <ModalProvider>
          <Layout
            header={<HeaderSection />}
            info={<InfoSection />}
            game={<GameScreen />}
          />
          {/* Opens itself when the server closes out a grant, so it does not
              belong to any one screen. */}
          <FreeBetCompleted />
        </ModalProvider>
      </GameProvider>
    </LaunchGate>
  );
}

export default App;
