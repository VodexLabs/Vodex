"use client";

import * as React from "react";
import { ImportedSecretsSetupPanel } from "@/components/import/imported-secrets-setup-panel";
import { cn } from "@/lib/utils";

/**
 * In-chat secret setup — compact, no nested Ask AI button.
 */
export function SecretSetupPanel({
  projectId,
  envRequirements,
  className,
  onSaved,
  onClose,
  onSkipOptional,
}: {
  projectId: string;
  envRequirements: unknown;
  className?: string;
  onSaved?: () => void;
  onClose?: () => void;
  onSkipOptional?: () => void;
}) {
  return (
    <div
      data-testid="secret-setup-panel"
      className={cn(
        "mt-2 rounded-xl border border-accent/20 bg-surface/95 p-2.5 shadow-sm ring-1 ring-accent/10",
        className,
      )}
    >
      <p className="mb-1.5 text-[11px] font-semibold text-foreground">Secure secret setup</p>
      <ImportedSecretsSetupPanel
        projectId={projectId}
        envRequirements={envRequirements}
        variant="compact"
        onSaved={onSaved}
        onClose={onClose}
        onSkipOptional={onSkipOptional}
      />
    </div>
  );
}
