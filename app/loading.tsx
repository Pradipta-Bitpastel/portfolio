export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 flex items-center justify-center bg-bg"
    >
      <div className="font-mono text-sm text-ink-dim">booting core...</div>
    </div>
  );
}
