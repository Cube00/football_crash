import { lazy, Suspense, useEffect } from "react";
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
// Every body is loaded on demand. None of them can be on screen before the
// player opens one, and together they are a third of the main bundle — parsed
// during load for a dialog most sessions never open.
const named = <T extends string>(key: T) =>
  <M extends Record<T, React.ComponentType<never>>>(module: M) => ({
    default: module[key],
  });

const ProbablyFairContent = lazy(() =>
  import("@/components/ui/ProbablyFairContent").then(
    named("ProbablyFairContent"),
  ),
);
const LimitsContent = lazy(() =>
  import("@/components/ui/LimitsContent").then(named("LimitsContent")),
);
const PointDetailsContent = lazy(() =>
  import("@/components/ui/PointDetailsContent").then(
    named("PointDetailsContent"),
  ),
);
const BonusBetContent = lazy(() =>
  import("@/components/ui/BonusBetContent").then(named("BonusBetContent")),
);
const BonusSpinContent = lazy(() =>
  import("@/components/ui/BonusSpinContent").then(named("BonusSpinContent")),
);
const FreeBetsContent = lazy(() =>
  import("@/components/ui/FreeBetsContent").then(named("FreeBetsContent")),
);
const ArchiveContent = lazy(() =>
  import("@/components/ui/ArchiveContent").then(named("ArchiveContent")),
);
const HowToPlayContent = lazy(() =>
  import("@/components/ui/HowToPlayContent").then(named("HowToPlayContent")),
);

/**
 * Pulls every body down once the tab falls idle.
 *
 * Splitting the bodies out keeps them from being parsed during load, but on its
 * own it moves the cost to the click: the fetch starts when the player opens
 * the dialog, so the frame paints its header over an empty body until the
 * module lands. Fetching ahead of the click keeps both — the bodies stay out of
 * the critical path, and the modal has its content the frame it opens.
 */
const prefetchContents = () => {
  void Promise.all([
    import("@/components/ui/ProbablyFairContent"),
    import("@/components/ui/LimitsContent"),
    import("@/components/ui/PointDetailsContent"),
    import("@/components/ui/BonusBetContent"),
    import("@/components/ui/BonusSpinContent"),
    import("@/components/ui/FreeBetsContent"),
    import("@/components/ui/ArchiveContent"),
    import("@/components/ui/HowToPlayContent"),
    // A prefetch that fails is not an error — opening the dialog retries it,
    // and Suspense reports it there.
  ]).catch(() => {});
};

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

  // Idle, so the bodies queue behind the game's own boot rather than racing it.
  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (!idle) {
      const timer = window.setTimeout(prefetchContents, 2000);
      return () => window.clearTimeout(timer);
    }
    const handle = idle(prefetchContents, { timeout: 5000 });
    return () => window.cancelIdleCallback(handle);
  }, []);

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
      <Suspense fallback={null}>{content}</Suspense>
    </Modal>
  );
}
