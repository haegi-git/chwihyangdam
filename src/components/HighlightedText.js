import { splitHighlight } from "@/lib/board";

export default function HighlightedText({ text, term }) {
  const parts = splitHighlight(text, term);

  return parts.map((part, index) =>
    part.match ? (
      <mark key={`${index}-${part.text}`} className="search-hit">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
