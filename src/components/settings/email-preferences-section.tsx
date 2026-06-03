"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function EmailPreferencesSection() {
  const [marketingOptIn, setMarketingOptIn] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void fetch("/api/notification-preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { marketingOptIn?: boolean } | null) => {
        if (typeof json?.marketingOptIn === "boolean") setMarketingOptIn(json.marketingOptIn);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ marketingOptIn }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Email preferences saved");
    } catch {
      toast.error("Could not save email preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card data-testid="email-preferences-section">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Mail className="size-4 text-accent" strokeWidth={1.55} />
          <div>
            <CardTitle>Email preferences</CardTitle>
            <CardDescription>
              Product updates and marketing emails — separate from in-app notification sounds.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-[13px] font-medium text-foreground">Product emails</p>
            <p className="text-[12px] text-muted-foreground">
              Tips, features, and offers via email. Transactional messages may still be sent when required.
            </p>
          </div>
          <Switch
            checked={marketingOptIn}
            onCheckedChange={setMarketingOptIn}
            disabled={loading}
            aria-label="Product marketing emails"
          />
        </div>
        <div className="mt-4 flex justify-center border-t border-border pt-4">
          <Button variant="accent" size="md" disabled={saving || loading} onClick={() => void save()}>
            Save email preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
