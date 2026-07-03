import "./App.css";
import { Size } from "@/constants";
import {
  RoundsButton,
  RoundsButtonVariants,
} from "./components/ui/RoundsButton";
import { AmountButton } from "./components/ui/AmountButton";

function App() {
  return (
    <div
      style={{
        padding: 30,
        display: "flex",
        gap: 14,
      }}
    >
      <RoundsButton variant={RoundsButtonVariants.Stop} size={Size.Web} />
      <RoundsButton variant={RoundsButtonVariants.Default} size={Size.Web} />
      <RoundsButton variant={RoundsButtonVariants.Click} size={Size.Web} />
      <AmountButton label="2.00" />
      <AmountButton label="+ 2.00" active />
    </div>
  );
}

export default App;
