"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variants } from "@/lib/motion";

export function WaitlistView() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Orbs */}
      <div className="ds-orb pointer-events-none absolute -left-[20%] top-[-15%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_62%)] blur-3xl" />
      <div className="ds-orb ds-orb-2 pointer-events-none absolute right-[-15%] top-[10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,#9dc6ff_18%,transparent),transparent_64%)] blur-3xl" />

      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-lg text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-8 flex size-20 items-center justify-center"
        >
          <Image
            src="/logo.png"
            alt="DreamOS86"
            width={80}
            height={80}
            className="drop-shadow-[0_8px_32px_rgba(30,107,255,0.4)]"
            priority
            loading="eager"
          />
        </motion.div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1 text-[12px] font-semibold text-accent ring-1 ring-accent/20">
          <Sparkles className="size-3" strokeWidth={2} />
          Coming Soon
        </span>

        <h1 className="mt-5 text-balance text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.06em] text-foreground">
          The future of software creation
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          DreamOS86 turns a description into a living, deployed app.
          Join the waitlist and be first to create something extraordinary.
        </p>

        {/* Social proof */}
        <div className="my-6 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["#4285f4", "#f97316", "#10a37f", "#8b5cf6", "#f43f5e"].map((color, i) => (
              <div
                key={i}
                className="flex size-8 items-center justify-center rounded-full ring-2 ring-background"
                style={{ backgroundColor: color }}
              >
                <span className="text-[10px] font-bold text-white">
                  {["A", "M", "S", "J", "K"][i]}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground">4,200+</span> builders on the waitlist
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[var(--radius-xl)] bg-positive/10 px-6 py-4 text-center ring-1 ring-positive/20"
          >
            <p className="text-[15px] font-semibold text-positive">You're on the list! 🎉</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              We'll notify you the moment early access opens.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) setSubmitted(true);
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button variant="accent" size="lg" type="submit" disabled={!email}>
              Join
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </Button>
          </form>
        )}

        {/* Features preview */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, title: "AI-first creation", desc: "Describe it. See it live." },
            { icon: Zap, title: "Deploy instantly", desc: "From idea to production in minutes." },
            { icon: Shield, title: "Always yours", desc: "Export and own your code." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[var(--radius-lg)] bg-surface/60 px-4 py-3.5 text-left backdrop-blur-xl ring-1 ring-border"
            >
              <item.icon className="size-4 text-accent" strokeWidth={1.65} />
              <p className="mt-2 text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-muted-foreground">
          Already have access?{" "}
          <Link href="/auth/login" className="font-medium text-accent hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
