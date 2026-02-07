import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type QuorumChipProps = {
  label: string;
  href?: string;
  active?: boolean;
  onSelect?: () => void;
};

export function QuorumChip({ label, href, active = false, onSelect }: QuorumChipProps) {
  const baseClassName = cn(
    "rounded-full",
    active && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
  );

  if (onSelect) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={baseClassName}
        onClick={onSelect}
      >
        {label}
      </Button>
    );
  }

  if (!href) {
    return null;
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={baseClassName}
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}
