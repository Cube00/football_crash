import "./App.css";
import { BetButton } from "./components/ui/BetButton";

function App() {
  return (
    <div
      style={{
        padding: 30,
        display: "flex",
        gap: 14,
      }}
    >
      <BetButton
        variant="bet"
        size="web"
        label="Bet"
        currency="USD"
        amount="1.00"
      />

      <BetButton
        variant="cashout"
        size="web"
        label="Cashout"
        currency="USD"
        amount="1.00"
      />

      <BetButton
        variant="cancel"
        size="web"
        label="Cancel"
        currency="USD"
        amount="1.00"
      />

      <BetButton
        variant="cancel"
        size="web"
        label="Cancel"
        text="Waiting for next round"
      />

      <BetButton
        variant="freebet"
        size="web"
        label="Free bet"
        currency="USD"
        amount="1.00"
      />
    </div>
  );
}

export default App;
