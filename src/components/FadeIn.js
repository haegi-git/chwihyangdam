export default function FadeIn({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`fade-rise ${className}`.trim()}
      style={{ "--fade-delay": `${delay}ms` }}
      {...props}
    >
      {children}
    </Tag>
  );
}
