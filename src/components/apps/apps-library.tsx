"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { showcaseApps } from "@/config/apps";
import { AppCard } from "@/components/apps/app-card";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";

const featured = showcaseApps.find((a) => a.featured);
const rest = showcaseApps.filter((a) => !a.featured);

export function AppsLibrary() {
  const router = useRouter();

  return (
    <div className="mt-12 space-y-5">
      {featured ? (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          className="w-full"
        >
          <AppCard app={featured} layout="featured" />
        </motion.div>
      ) : null}

      <motion.div
        variants={variants.staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {rest.map((app) => (
          <motion.div key={app.id} variants={variants.staggerItem}>
            <AppCard app={app} layout="default" />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="flex justify-center pt-4"
      >
        <Button
          variant="secondary"
          size="lg"
          className="gap-2"
          onClick={() => router.push("/")}
        >
          Start from prompt
        </Button>
      </motion.div>
    </div>
  );
}

export function AppsHeroActions() {
  const router = useRouter();
  return (
    <Button
      variant="primary"
      size="lg"
      className="gap-2"
      onClick={() => router.push("/")}
    >
      <Plus className="size-4" strokeWidth={1.75} />
      New app
    </Button>
  );
}
