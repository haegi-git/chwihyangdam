export default function PageShell({
  children,
  narrow = false,
  className = "",
}) {
  return (
    <div
      className={`mx-auto w-full px-6 py-16 md:px-8 md:py-24 ${
        narrow ? "max-w-3xl" : "max-w-5xl"
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
