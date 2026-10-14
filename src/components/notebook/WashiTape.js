export default function WashiTape({ tone = "sage", className = "" }) {
  return (
    <span
      className={`washi ${tone === "pink" ? "washi-pink" : ""} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
