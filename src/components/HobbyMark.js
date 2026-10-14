export default function HobbyMark({ name }) {
  if (!name) {
    return null;
  }

  return <span className="mr-2 font-sans text-[0.62em] tracking-wide text-sage-deep">[{name}]</span>;
}
