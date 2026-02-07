"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("mq-markdown text-sm leading-relaxed text-foreground/90", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 mt-4 font-heading text-2xl font-semibold tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 font-heading text-xl font-semibold tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 font-heading text-lg font-semibold tracking-tight">{children}</h3>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-primary/25 bg-muted/40 px-3 py-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: (props) => renderCode(props),
          pre: ({ children }) => <pre className="mb-3">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded border border-border">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function renderCode(props: { children?: React.ReactNode; className?: string; inline?: boolean }) {
  if (props.inline) {
    return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{props.children}</code>;
  }

  return (
    <code className={cn("block overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100", props.className)}>
      {props.children}
    </code>
  );
}
