/** Soft section pause: line — symbol — line (no illustration). */
export function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <span className="divider-line" />
      <span className="divider-symbol">✦</span>
      <span className="divider-line" />
    </div>
  );
}
