import { useCallback, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { ModalContext } from "./modal-context";
import { ModalRoot } from "./ModalRoot";
import type { ModalId } from "./modals.constants";
import type { ModalContextValue, ModalPayload } from "./ModalProvider.types";

interface ActiveModal {
  id: ModalId;
  payload?: ModalPayload;
}

export function ModalProvider({ children }: PropsWithChildren) {
  const [active, setActive] = useState<ActiveModal | null>(null);

  const open = useCallback(
    (id: ModalId, payload?: ModalPayload) => setActive({ id, payload }),
    [],
  );
  const close = useCallback(() => setActive(null), []);

  const value = useMemo<ModalContextValue>(
    () => ({ open, close }),
    [open, close],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ModalRoot
        activeModal={active?.id ?? null}
        payload={active?.payload}
        open={open}
        close={close}
      />
    </ModalContext.Provider>
  );
}
