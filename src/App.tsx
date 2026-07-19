import "./App.css";
import { Layout } from "./components/layout";
import { InfoSection } from "./containers/InfoSection";
import { GameScreen } from "./containers/GameScreen";
import { ModalProvider } from "./context/ModalProvider";

function App() {
  return (
    <ModalProvider>
      <Layout info={<InfoSection />} game={<GameScreen />} />
    </ModalProvider>
  );
}

export default App;
