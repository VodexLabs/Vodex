/** User-local reset label with exact time and timezone. */
export function formatCreditResetLocal(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const tzPart =
    new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `Resets ${datePart} at ${timePart} ${tzPart}`;
}
