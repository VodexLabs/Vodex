export const DESTRUCTIVE_ACTION_TYPES = [
  "delete_workspace",
  "delete_project",
  "delete_failed_project",
] as const;

export type DestructiveActionType = (typeof DESTRUCTIVE_ACTION_TYPES)[number];

export const DESTRUCTIVE_ACTION_PHRASES: Record<DestructiveActionType, string> = {
  delete_workspace: "delete workspace",
  delete_project: "delete project",
  delete_failed_project: "delete project",
};

export function isDestructiveActionType(value: string): value is DestructiveActionType {
  return (DESTRUCTIVE_ACTION_TYPES as readonly string[]).includes(value);
}

export function destructiveActionSummary(
  actionType: DestructiveActionType,
  targetName?: string | null,
): string {
  switch (actionType) {
    case "delete_workspace":
      return "Delete your entire Vodex workspace";
    case "delete_project":
      return targetName
        ? `Permanently delete project “${targetName}”`
        : "Permanently delete this project";
    case "delete_failed_project":
      return targetName
        ? `Permanently delete failed project “${targetName}”`
        : "Permanently delete this failed project";
    default:
      return actionType;
  }
}
