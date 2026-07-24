import "./App.css";
import { Layout } from "./components/layout";
import { HeaderSection } from "./containers/HeaderSection";
import { InfoSection } from "./containers/InfoSection";
import { GameScreen } from "./containers/GameScreen";
import { ModalProvider } from "./context/ModalProvider";
import { GameProvider } from "./context/GameProvider";

function App() {
  return (
    <GameProvider>
      <ModalProvider>
        <Layout
          header={<HeaderSection />}
          info={<InfoSection />}
          game={<GameScreen />}
        />
      </ModalProvider>
    </GameProvider>
  );
}

export default App;
