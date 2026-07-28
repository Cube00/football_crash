import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import styles from "./ModalRoot.module.css";
import {
  ModalId,
  MODAL_PARENTS,
  MODAL_TITLE_KEYS,
  MODAL_WIDTHS,
} from "./modals.constants";
import type { ModalContextValue, ModalPayload } from "./ModalProvider.types";
import { ProbablyFairContent } from "@/components/ui/ProbablyFairContent";
import { LimitsContent } from "@/components/ui/LimitsContent";
import { PointDetailsContent } from "@/components/ui/PointDetailsContent";
import { BonusBetContent } from "@/components/ui/BonusBetContent";
import { BonusSpinContent } from "@/components/ui/BonusSpinContent";
import { FreeBetsContent } from "@/components/ui/FreeBetsContent";
import { ArchiveContent } from "@/components/ui/ArchiveContent";

interface ModalRootProps extends ModalContextValue {
  activeModal: ModalId | null;
  payload?: ModalPayload;
}

/** Renders the currently active modal and its content. */
export function ModalRoot({
  activeModal,
  payload,
  open,
  close,
}: ModalRootProps) {
  const { t } = useTranslation();

  if (activeModal === null) return null;

  const title = t(MODAL_TITLE_KEYS[activeModal]);

  let content: ReactNode;
  switch (activeModal) {
    case ModalId.ProvablyFair:
      content = <ProbablyFairContent />;
      break;
    case ModalId.Limits:
      content = <LimitsContent />;
      break;
    case ModalId.PointDetails:
      content = <PointDetailsContent point={payload} />;
      break;
    case ModalId.BonusBet:
      content = <BonusBetContent />;
      break;
    case ModalId.BonusSpin:
      content = <BonusSpinContent />;
      break;
    case ModalId.BetType:
      content = <FreeBetsContent />;
      break;
    case ModalId.Archive:
      content = <ArchiveContent />;
      break;
    default:
      content = (
        <p className={styles["modal-root__placeholder"]}>
          {t("common.comingSoon", { title })}
        </p>
      );
  }

  const parent = MODAL_PARENTS[activeModal];

  return (
    <Modal
      key={activeModal}
      isOpen
      title={title}
      width={MODAL_WIDTHS[activeModal]}
      onClose={close}
      onBack={parent ? () => open(parent) : undefined}
    >
      {content}
    </Modal>
  );
}
