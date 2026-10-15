export default function ShareBadge({ shared }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs tracking-wide ${
        shared ? "bg-sage-mist text-sage-deep" : "bg-paper-deep text-ink-soft"
      }`}
    >
      {shared ? "친구 공개" : "나만 보기"}
    </span>
  );
}
