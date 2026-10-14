export default function PageFrame({ children, narrow = false, className = "" }) {
  return (
    <div
      className={`mx-auto w-full px-5 py-10 md:px-10 md:py-16 ${
        narrow ? "max-w-3xl" : "max-w-6xl"
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
