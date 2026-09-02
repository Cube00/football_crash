import type { FreeroundGrant } from "@/sdk";

export interface FreeBetCardProps {
  grant: FreeroundGrant;
  /** Whether this grant is the bound one. */
  checked: boolean;
  /** Whether the accrual details are open. */
  expanded: boolean;
  /** Whether the grant can still be bound and bet from. */
  bindable: boolean;
  onSelect: (grantId: string) => void;
  onToggle: (grantId: string) => void;
}
