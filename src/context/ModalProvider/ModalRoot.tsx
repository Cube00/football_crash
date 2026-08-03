import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import styles from "./ModalRoot.module.css";
import {
  ModalId,
  MOBILE_SHEET_MODALS,
  MODAL_PARENTS,
  MODAL_TITLE_KEYS,
  MODAL_WIDTHS,
} from "./modals.constants";
import type { ModalContextValue, ModalPayload } from "./ModalProvider.types";
/*
 * The bodies are imported outright, not split behind `lazy`.
 *
 * Splitting them looked free, but no amount of prefetching makes a `lazy`
 * component mount without suspending first: React's lazy has to call its own
 * loader, and that returns a promise even when the module is already in memory,
 * so the first open of each dialog always commits the fallback before the
 * content. That commit is the blank modal — a hole no warming can close.
 *
 * The whole set is ~16 kB gzipped against a 116 kB bundle, next to a 377 kB
 * Phaser chunk. Cheap enough that the dialogs opening finished is worth more.
 */
import { ProbablyFairContent } from "@/components/ui/ProbablyFairContent";
import { LimitsContent } from "@/components/ui/LimitsContent";
import { PointDetailsContent } from "@/components/ui/PointDetailsContent";
import { BonusBetContent } from "@/components/ui/BonusBetContent";
import { BonusSpinContent } from "@/components/ui/BonusSpinContent";
import { FreeBetsContent } from "@/components/ui/FreeBetsContent";
import { ArchiveContent } from "@/components/ui/ArchiveContent";
import { HowToPlayContent } from "@/components/ui/HowToPlayContent";

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
    case ModalId.HowToPlay:
      content = <HowToPlayContent />;
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
      mobileSheet={MOBILE_SHEET_MODALS.includes(activeModal)}
      onClose={close}
      onBack={parent ? () => open(parent) : undefined}
    >
      {content}
    </Modal>
  );
}
