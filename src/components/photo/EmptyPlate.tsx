/** A bare place setting seen from above: where the photo will go. */
export function EmptyPlate({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" aria-hidden className={className} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="square">
      <circle cx="120" cy="80" r="58" fill="var(--room)" />
      <circle cx="120" cy="80" r="38" fill="#fff" />
      <path d="M34 30v36M26 30v22h16V30M34 66v64" />
      <path d="M206 130V30c-10 8-14 24-14 44h14" />
    </svg>
  );
}
