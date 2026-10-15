export default function HiddenNotice({ className = "", inline = false }) {
  if (inline) {
    return (
      <span className={`hidden-pill ${className}`.trim()} role="status">
        커뮤니티 안내에 따라 잠시 가려졌어요
      </span>
    );
  }

  return (
    <p
      className={`rounded-2xl bg-sage-mist/80 px-4 py-3 text-sm leading-7 text-sage-deep ${className}`.trim()}
      role="status"
    >
      커뮤니티 안내에 따라 잠시 가려졌어요
    </p>
  );
}
