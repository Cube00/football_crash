import type { ModalId } from './modals.constants';

export interface ModalContextValue {
  open: (id: ModalId) => void;
  close: () => void;
}
