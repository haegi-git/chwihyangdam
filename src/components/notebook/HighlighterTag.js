export default function HighlighterTag({ name }) {
  if (!name) {
    return null;
  }

  return <span className="highlighter">[{name}]</span>;
}
