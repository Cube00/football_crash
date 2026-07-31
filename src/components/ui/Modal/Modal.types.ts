import type { ReactNode } from 'react';

/** Available sheet widths, mapped to the matching `--size-*` design tokens. */
export const ModalWidth = {
  Sm: 370,
  Md: 542,
  Lg: 580,
  Xl: 768,
  Xxl: 1006,
} as const;

export type ModalWidth = (typeof ModalWidth)[keyof typeof ModalWidth];

export interface ModalProps {
  /** Whether the modal is mounted and visible. */
  isOpen: boolean;
  /** Fired on close intent: close button, overlay click, or Escape. */
  onClose: () => void;
  /** Heading shown in the modal header. */
  title: string;
  /** Body content, rendered inside the scrollable area. */
  children: ReactNode;
  /** Shows a back arrow left of the title. Omit for top-level modals. */
  onBack?: () => void;
  /** Accessible label for the close button. */
  closeLabel?: string;
  /** Accessible label for the back button. */
  backLabel?: string;
  /** Max width of the sheet. Defaults to 600px when omitted. */
  width?: ModalWidth;
  /**
   * Turns the modal into a bottom sheet on mobile: full width, docked to the
   * bottom edge and rounded on the top corners only.
   */
  mobileSheet?: boolean;
  /** Extra class for the modal container (the sheet). */
  className?: string;
}
