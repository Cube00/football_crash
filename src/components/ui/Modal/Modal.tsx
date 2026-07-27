import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/utils';
import { useBodyScrollLock, useFocusTrap, useOnEscape } from '@/hooks';
import { Icon } from '@/components/ui/Icon';
import { playSound, Sound } from '@/game/sounds';
import styles from './Modal.module.css';
import type { ModalProps } from './Modal.types';

export function Modal({
  isOpen,
  onClose,
  onBack,
  title,
  children,
  closeLabel = 'Close',
  backLabel = 'Back',
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
          <div className={styles['modal__heading']}>
            {onBack && (
              <button
                type="button"
                className={styles['modal__back']}
                onClick={() => {
                  playSound(Sound.SmallButton);
                  onBack();
                }}
                aria-label={backLabel}
              >
                <Icon src="/assets/icons/Arrow left.svg" />
              </button>
            )}
            <h2 id={titleId} className={styles['modal__title']}>
              {title}
            </h2>
          </div>
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
