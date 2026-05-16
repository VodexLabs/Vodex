"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FloatingBackground } from "@/components/create/floating-background";
import { PromptComposer } from "@/components/create/prompt-composer";
import { SuggestionChips } from "@/components/create/suggestion-chips";
import { RecentApps } from "@/components/create/recent-apps";
import { TemplateShowcase } from "@/components/create/template-showcase";
import { ImportBar } from "@/components/create/import-bar";
import { variants } from "@/lib/motion";

export function CreateHome() {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState("");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  const submit = React.useCallback(() => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    // Navigate to generation workspace with the prompt and attachment count
    const params = new URLSearchParams({ prompt: text });
    if (attachments.length > 0) {
      params.set("attachments", attachments.length.toString());
    }
    router.push(`/generate?${params.toString()}`);
  }, [prompt, attachments, busy, router]);

  const applySeed = React.useCallback((text: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
  }, []);

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <FloatingBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:pt-[4.5rem]">
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-3xl text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-8 flex size-16 items-center justify-center"
          >
            <Image
              src="/logo.png"
              alt="DreamOS86"
              width={64}
              height={64}
              className="drop-shadow-[0_8px_24px_rgba(30,107,255,0.35)]"
              priority
              loading="eager"
            />
          </motion.div>

          <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground">
            DREAMOS86
          </p>
          <h1 className="mt-5 text-balance text-[clamp(2.15rem,4.2vw,3.35rem)] font-semibold tracking-[-0.055em] text-foreground">
            An operating system for{" "}
            <span className="bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
              imagined software
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
            Speak it into being — structure, interface, and motion coalesce around
            your intent. Quiet power. No noise.
          </p>
        </motion.div>

        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.06 }}
          className="mx-auto mt-10 max-w-3xl"
        >
          {/* Import bar — above prompt */}
          <div className="mb-5">
            <ImportBar onFilesAttached={setAttachments} />
          </div>

          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSubmit={submit}
            busy={busy}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
          <SuggestionChips onPick={applySeed} disabled={busy} />
        </motion.div>
      </div>

      <RecentApps />
      <TemplateShowcase onUseTemplate={applySeed} />
    </div>
  );
}
