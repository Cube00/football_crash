import { createContext } from 'react';
import type { ModalContextValue } from './ModalProvider.types';

export const ModalContext = createContext<ModalContextValue | null>(null);
