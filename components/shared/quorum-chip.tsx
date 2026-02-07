import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type QuorumChipProps = {
  label: string;
  href: string;
  active?: boolean;
};

export function QuorumChip({ label, href, active = false }: QuorumChipProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(
        "rounded-full",
        active && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
      )}
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}
