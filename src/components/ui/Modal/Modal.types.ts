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
  /** Accessible label for the close button. */
  closeLabel?: string;
  /** Max width of the sheet. Defaults to 600px when omitted. */
  width?: ModalWidth;
  /** Extra class for the modal container (the sheet). */
  className?: string;
}
