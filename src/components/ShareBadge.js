export default function ShareBadge({ shared }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs tracking-wide ${
        shared ? "bg-sage-mist text-sage-deep" : "bg-paper-deep text-ink-soft"
      }`}
    >
      {shared ? "친구에게 공유" : "비공개"}
    </span>
  );
}
