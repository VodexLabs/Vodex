"use client";

import * as React from "react";
import { aiModels } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  SectionCard,
  SettingRow,
  FieldLabel,
  SectionFooter,
  selectCls,
  textareaCls,
} from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, ImagePlus, Trash2, AlertTriangle } from "lucide-react";

type Theme = "light" | "dark" | "system";

export default function SettingsGeneralPage() {
  const [theme, setTheme] = React.useState<Theme>("system");
  const [sidebarStyle, setSidebarStyle] = React.useState(true);
  const [fontSize, setFontSize] = React.useState("15");
  const [workspaceName, setWorkspaceName] = React.useState("My Workspace");
  const [description, setDescription] = React.useState(
    "Building the next generation of AI-native apps.",
  );
  const [defaultModel, setDefaultModel] = React.useState("claude-sonnet");
  const [autoSave, setAutoSave] = React.useState(true);
  const [streaming, setStreaming] = React.useState(true);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deleteInput, setDeleteInput] = React.useState("");

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] =
    [
      { value: "light", label: "Light", icon: <Sun className="size-4" strokeWidth={1.6} /> },
      { value: "dark", label: "Dark", icon: <Moon className="size-4" strokeWidth={1.6} /> },
      { value: "system", label: "System", icon: <Monitor className="size-4" strokeWidth={1.6} /> },
    ];

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <SectionCard
        title="Appearance"
        description="Customize how DreamOS86 looks and feels."
      >
        <div className="space-y-6">
          <div>
            <FieldLabel>Theme</FieldLabel>
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-[13px] font-medium ring-1 transition-all duration-150",
                    theme === opt.value
                      ? "bg-foreground/[0.07] ring-border-strong text-foreground"
                      : "bg-surface ring-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Font Size</FieldLabel>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className={selectCls}
              >
                <option value="13">Small (13px)</option>
                <option value="14">Normal (14px)</option>
                <option value="15">Medium (15px)</option>
                <option value="16">Large (16px)</option>
              </select>
            </div>
          </div>

          <SettingRow
            title="Compact sidebar"
            description="Show icons only in the sidebar to maximize workspace area."
          >
            <Switch
              checked={sidebarStyle}
              onCheckedChange={setSidebarStyle}
              aria-label="Compact sidebar"
            />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Workspace */}
      <SectionCard
        title="Workspace"
        description="General information about your workspace."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-[var(--radius-lg)] bg-accent-muted ring-1 ring-border flex items-center justify-center text-[22px] font-bold text-accent select-none">
              {workspaceName.charAt(0).toUpperCase()}
            </div>
            <div>
              <Button variant="secondary" size="sm" className="gap-1.5">
                <ImagePlus className="size-3.5" strokeWidth={1.6} />
                Upload icon
              </Button>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                PNG or JPG, max 2MB
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Workspace name</FieldLabel>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Workspace"
              />
            </label>
          </div>

          <label className="block">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does your workspace do?"
              className={textareaCls}
            />
          </label>
        </div>
        <SectionFooter>
          <Button variant="ghost" size="md">Discard</Button>
          <Button variant="accent" size="md">Save changes</Button>
        </SectionFooter>
      </SectionCard>

      {/* Generation */}
      <SectionCard
        title="Generation"
        description="Default behavior when generating new apps and components."
      >
        <div className="space-y-1">
          <div className="pb-4 border-b border-border">
            <FieldLabel>Default model</FieldLabel>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className={cn(selectCls, "max-w-xs")}
            >
              {aiModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.creditsPerGeneration} credit
                  {m.creditsPerGeneration !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Used for new generations unless overridden per project.
            </p>
          </div>

          <SettingRow
            title="Auto-save drafts"
            description="Automatically save generation drafts every 30 seconds."
          >
            <Switch
              checked={autoSave}
              onCheckedChange={setAutoSave}
              aria-label="Auto-save drafts"
            />
          </SettingRow>

          <SettingRow
            title="Streaming output"
            description="Show token-by-token output as the model generates."
          >
            <Switch
              checked={streaming}
              onCheckedChange={setStreaming}
              aria-label="Streaming output"
            />
          </SettingRow>
        </div>
        <SectionFooter>
          <Button variant="ghost" size="md">Discard</Button>
          <Button variant="accent" size="md">Save changes</Button>
        </SectionFooter>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard
        title="Danger Zone"
        description="Irreversible actions that affect your entire workspace."
        danger
      >
        {!deleteConfirm ? (
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Delete workspace
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Permanently delete this workspace, all projects, and data.
                This cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              className="shrink-0 text-red-600 dark:text-red-400 ring-red-200/70 dark:ring-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="size-3.5" strokeWidth={1.6} />
              Delete workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-red-100/60 dark:bg-red-950/30 px-4 py-3 ring-1 ring-red-200/60 dark:ring-red-800/40">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" strokeWidth={1.6} />
              <p className="text-[13px] text-red-700 dark:text-red-300">
                Type <strong>delete workspace</strong> below to confirm.
              </p>
            </div>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='Type "delete workspace" to confirm'
              className="ring-red-200/70 dark:ring-red-800/40 focus:ring-red-400"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="md"
                disabled={deleteInput !== "delete workspace"}
                className="text-red-600 dark:text-red-400 ring-red-200/70 dark:ring-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
              >
                Permanently delete
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
