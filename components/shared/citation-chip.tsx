import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { Citation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

type CitationChipProps = {
  citation: Citation;
};

export function CitationChip({ citation }: CitationChipProps) {
  const href = citation.url ?? (citation.doi ? `https://doi.org/${citation.doi}` : undefined);

  if (!href) {
    return (
      <Badge variant="outline" className="gap-1 font-mono">
        <FileText className="h-3.5 w-3.5" />
        {citation.source}
      </Badge>
    );
  }

  return (
    <Badge asChild variant="outline" className="gap-1 font-mono">
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <FileText className="h-3.5 w-3.5" />
        {citation.doi ? `DOI:${citation.doi}` : citation.source}
        <ExternalLink className="h-3 w-3" />
      </Link>
    </Badge>
  );
}
