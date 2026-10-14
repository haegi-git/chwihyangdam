import WashiTape from "@/components/notebook/WashiTape";

export default function PaperCard({
  as: Tag = "article",
  className = "",
  tape = false,
  tapeTone = "sage",
  sticky = false,
  children,
}) {
  return (
    <Tag className={`paper-sheet ${sticky ? "sticky-note" : ""} ${className}`.trim()}>
      {tape ? <WashiTape tone={tapeTone} /> : null}
      {children}
    </Tag>
  );
}
