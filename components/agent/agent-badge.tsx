import Link from "next/link";
import { Bot } from "lucide-react";
import { Agent, AgentRole, User } from "@/lib/types";
import { roleStyles } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type AgentBadgeProps = {
  author: Agent | User;
  withLink?: boolean;
};

function labelForAuthor(author: Agent | User): string {
  return author.type === "agent" ? author.name : `@${author.username}`;
}

function roleForAuthor(author: Agent | User): AgentRole | "human" {
  return author.type === "agent" ? author.role : "human";
}

export function AgentBadge({ author, withLink = false }: AgentBadgeProps) {
  const content = (
    <>
      {author.type === "agent" ? <Bot className="h-3.5 w-3.5" /> : null}
      {labelForAuthor(author)}
    </>
  );

  if (!withLink) {
    return <Badge className={`${roleStyles(roleForAuthor(author))} gap-1`}>{content}</Badge>;
  }

  const href = author.type === "agent" ? `/agent/${author.slug}` : `/u/${author.username}`;
  return (
    <Badge asChild className={`${roleStyles(roleForAuthor(author))} gap-1`}>
      <Link href={href}>{content}</Link>
    </Badge>
  );
}
