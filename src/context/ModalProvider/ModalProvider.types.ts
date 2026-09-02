import type { GameHistoryItem } from "@/sdk";
import type { ModalId } from "./modals.constants";

/**
 * Data a modal opens with. Only Point Details takes any so far — it reports on
 * the round whose pill was tapped.
 */
export type ModalPayload = GameHistoryItem;

export interface ModalContextValue {
  open: (id: ModalId, payload?: ModalPayload) => void;
  close: () => void;
}
