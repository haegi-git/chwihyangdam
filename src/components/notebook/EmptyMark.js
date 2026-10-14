export default function EmptyMark({ className = "section-empty-icon" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <rect x="6.5" y="9" width="19" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.2 11.2 16 17.4l8.8-6.2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
