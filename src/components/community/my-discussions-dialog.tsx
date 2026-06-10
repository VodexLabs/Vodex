"use client";

import * as React from "react";
import { Loader2, Trash2, Pencil, MessageSquare } from "lucide-react";
import { OverlayDialog } from "@/components/ui/overlay-dialog";
import { ConfirmDialog } from "@/components/community/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "@/lib/toast";
import type { Discussion } from "@/lib/supabase/types";

type OwnDiscussion = Discussion & { reply_count?: number };

export function MyDiscussionsDialog({
  open,
  onClose,
  onOpenDiscussion,
  onDiscussionsChanged,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDiscussion: (d: OwnDiscussion) => void;
  onDiscussionsChanged?: () => void;
}) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [items, setItems] = React.useState<OwnDiscussion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editBody, setEditBody] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<OwnDiscussion | null>(null);

  const load = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setItems((data ?? []) as OwnDiscussion[]);
    } catch {
      toast.error("Could not load your discussions");
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function saveEdit(id: string) {
    const title = editTitle.trim();
    const body = editBody.trim();
    if (!title || !body) return;
    const { error } = await supabase.from("discussions").update({ title, body }).eq("id", id);
    if (error) {
      toast.error("Could not update discussion");
      return;
    }
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, title, body } : d)));
    setEditingId(null);
    onDiscussionsChanged?.();
    toast.success("Discussion updated");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("discussions").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Could not delete discussion");
      return;
    }
    setItems((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
    onDiscussionsChanged?.();
    toast.success("Discussion deleted");
  }

  return (
    <>
      <OverlayDialog open={open} onClose={onClose} layer="sheet" panelClassName="max-w-lg">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[15px] font-semibold">My discussions</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Edit or delete discussions you started.</p>
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">You have not started any discussions yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((d) => (
                <li key={d.id} className="rounded-xl bg-surface px-3 py-2.5 ring-1 ring-border">
                  {editingId === d.id ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg bg-background px-2.5 py-1.5 text-[13px] ring-1 ring-border"
                        placeholder="Title"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg bg-background px-2.5 py-1.5 text-[13px] ring-1 ring-border"
                        placeholder="Body"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-2.5 py-1 text-[12px] ring-1 ring-border">
                          Cancel
                        </button>
                        <button type="button" onClick={() => void saveEdit(d.id)} className="rounded-lg bg-accent px-2.5 py-1 text-[12px] text-white">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-[13px] font-medium">{d.title}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{d.body}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDiscussion(d);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-[11px] font-medium"
                        >
                          <MessageSquare className="size-3" /> Open
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(d.id);
                            setEditTitle(d.title);
                            setEditBody(d.body);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ring-border"
                        >
                          <Pencil className="size-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(d)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[11px] font-medium text-white"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </OverlayDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this discussion?"
        description="This removes the discussion and all of its comments permanently."
        confirmLabel="Delete discussion"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
