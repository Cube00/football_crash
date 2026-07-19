import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import styles from "./ModalRoot.module.css";
import { ModalId, MODAL_TITLES, MODAL_WIDTHS } from "./modals.constants";
import type { ModalContextValue } from "./ModalProvider.types";
import { ProbablyFairContent } from "@/components/ui/ProbablyFairContent";
import { LimitsContent } from "@/components/ui/LimitsContent";
import { PointDetailsContent } from "@/components/ui/PointDetailsContent";
import { BonusBetContent } from "@/components/ui/BonusBetContent";
import { BonusSpinContent } from "@/components/ui/BonusSpinContent";

interface ModalRootProps extends ModalContextValue {
  activeModal: ModalId | null;
}

/** Renders the currently active modal and its content. */
export function ModalRoot({ activeModal, close }: ModalRootProps) {
  if (activeModal === null) return null;

  let content: ReactNode;
  switch (activeModal) {
    case ModalId.ProvablyFair:
      content = <ProbablyFairContent />;
      break;
    case ModalId.Limits:
      content = <LimitsContent />;
      break;
    case ModalId.PointDetails:
      content = <PointDetailsContent />;
      break;
    case ModalId.BonusBet:
      content = <BonusBetContent />;
      break;
    case ModalId.BonusSpin:
      content = <BonusSpinContent />;
      break;
    default:
      content = (
        <p className={styles["modal-root__placeholder"]}>
          {MODAL_TITLES[activeModal]} — coming soon.
        </p>
      );
  }

  return (
    <Modal
      key={activeModal}
      isOpen
      title={MODAL_TITLES[activeModal]}
      width={MODAL_WIDTHS[activeModal]}
      onClose={close}
    >
      {content}
    </Modal>
  );
}
