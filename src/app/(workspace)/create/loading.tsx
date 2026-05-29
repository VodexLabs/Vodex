/** Route transition placeholder — shell lives in create/page (CreatePageBody). */
export default function CreateLoading() {
  return (
    <div className="h-screen w-full bg-background" aria-busy="true">
      <span className="sr-only">Loading create workspace…</span>
    </div>
  );
}
