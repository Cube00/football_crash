export interface CopyButtonProps {
  /** The text handed to the clipboard. */
  value: string;
  /** Whether this button is the one currently showing its copied note. */
  copied?: boolean;
  onCopy: (value: string) => void;
  /** Accessible name. Defaults to the shared "Copy" label. */
  label?: string;
  /** Icon size in px. Defaults to 20. */
  size?: number;
  className?: string;
}
