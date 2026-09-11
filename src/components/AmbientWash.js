export default function AmbientWash() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="wash-orb wash-orb-a" />
      <div className="wash-orb wash-orb-b" />
      <div className="wash-orb wash-orb-c" />
    </div>
  );
}
