import "./App.css";
import { Layout } from "./components/layout";
import { InfoSection } from "./containers/InfoSection";
import { GameScreen } from "./containers/GameScreen";

function App() {
  return <Layout info={<InfoSection />} game={<GameScreen />} />;
}

export default App;
