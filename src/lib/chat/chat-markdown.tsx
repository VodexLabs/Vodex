"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Lightweight safe markdown for assistant chat bubbles — no raw ** markers. */
export function ChatMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);

  return (
    <div className={cn("space-y-2 text-[14px] leading-relaxed", className)}>
      {blocks.map((block, i) => {
        if (block.type === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-muted/60 px-3 py-2 font-mono text-[12px] ring-1 ring-border/60"
            >
              <code>{block.content}</code>
            </pre>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            <InlineMarkdown text={block.content} />
          </p>
        );
      })}
    </div>
  );
}

function parseBlocks(text: string): Array<
  | { type: "p"; content: string }
  | { type: "code"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
> {
  const parts = text.split(/\n```/);
  const blocks: Array<
    | { type: "p"; content: string }
    | { type: "code"; content: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
  > = [];

  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      const end = part.indexOf("```");
      const body = (end >= 0 ? part.slice(0, end) : part).replace(/^\w*\n/, "");
      blocks.push({ type: "code", content: body.trimEnd() });
      const rest = end >= 0 ? part.slice(end + 3) : "";
      if (rest.trim()) pushParagraphBlocks(rest, blocks);
      return;
    }
    pushParagraphBlocks(part, blocks);
  });

  return blocks.length ? blocks : [{ type: "p", content: text }];
}

function pushParagraphBlocks(
  raw: string,
  blocks: Array<
    | { type: "p"; content: string }
    | { type: "code"; content: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
  >,
) {
  const paragraphs = raw.split(/\n{2,}/);
  for (const para of paragraphs) {
    const lines = para.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      blocks.push({ type: "ul", items: lines.map((l) => l.replace(/^[-*]\s+/, "")) });
      continue;
    }
    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      blocks.push({ type: "ol", items: lines.map((l) => l.replace(/^\d+\.\s+/, "")) });
      continue;
    }
    blocks.push({ type: "p", content: para.trim() });
  }
}

function InlineMarkdown({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={k++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={k++} className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[12px]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={k++}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline underline-offset-2"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
