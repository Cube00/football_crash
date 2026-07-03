import "./App.css";
import {
  MultiplierButton,
  MultiplierButtonVariant,
} from "./components/ui/MultiplierButton";

function App() {
  return (
    <div
      style={{
        padding: 30,
        display: "flex",
        gap: 14,
      }}
    >
      <MultiplierButton label="11.50x" variant={MultiplierButtonVariant.White} />
    </div>
  );
}

export default App;
