import "./App.css";
import {
  PlayNowBtnVariants,
  PlayNowButton,
} from "@/components/ui/PlayNowButton";
import { Size } from "@/constants";

function App() {
  return (
    <div
      style={{
        padding: 30,
        display: "flex",
        gap: 14,
      }}
    >
      <PlayNowButton variant={PlayNowBtnVariants.Orange} size={Size.Web} />
      <PlayNowButton variant={PlayNowBtnVariants.Green} size={Size.Web} />
      <PlayNowButton variant={PlayNowBtnVariants.Orange} size={Size.Mobile} />
      <PlayNowButton variant={PlayNowBtnVariants.Green} size={Size.Mobile} />
    </div>
  );
}

export default App;
