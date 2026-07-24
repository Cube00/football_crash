import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/utils';
import { useBodyScrollLock, useFocusTrap, useOnEscape } from '@/hooks';
import { playSound, Sound } from '@/game/sounds';
import styles from './Modal.module.css';
import type { ModalProps } from './Modal.types';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeLabel = 'Close',
  width,
  className,
}: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useBodyScrollLock(isOpen);
  useOnEscape(onClose, isOpen);
  useFocusTrap(sheetRef, isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles['modal']}>
      <div
        className={styles['modal__backdrop']}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={cx(
          styles['modal__sheet'],
          width && styles[`modal__sheet--${width}`],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles['modal__header']}>
          <h2 id={titleId} className={styles['modal__title']}>
            {title}
          </h2>
          <button
            type="button"
            className={styles['modal__close']}
            onClick={() => {
              playSound(Sound.SmallButton);
              onClose();
            }}
            aria-label={closeLabel}
          >
            <span className={styles['modal__close-icon']} aria-hidden="true" />
          </button>
        </header>

        <div className={styles['modal__content']}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
