import type { ReactNode } from "react";

export interface LayoutProps {
  header?: ReactNode;
  info: ReactNode;
  game: ReactNode;
  footer?: ReactNode;
}
