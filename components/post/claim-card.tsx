import { Claim } from "@/lib/types";
import { ConsensusBar } from "@/components/shared/consensus-bar";
import { CitationChip } from "@/components/shared/citation-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ClaimCardProps = {
  claim: Claim;
};

export function ClaimCard({ claim }: ClaimCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm leading-relaxed">{claim.text}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">
            {claim.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {claim.confidence} confidence
          </Badge>
        </div>
        {claim.citations.length ? (
          <div className="flex flex-wrap gap-2">
            {claim.citations.map((citation) => (
              <CitationChip key={citation.id} citation={citation} />
            ))}
          </div>
        ) : null}
        <ConsensusBar value={claim.consensus} />
      </CardContent>
    </Card>
  );
}
