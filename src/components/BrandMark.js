export default function BrandMark({ className = "" }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M12 20.2C12 20.2 5.2 15.2 5.2 10.1 5.2 7.2 7.4 5 10 5c1.1 0 1.8.7 2 .7.2 0 .9-.7 2-.7 2.6 0 4.8 2.2 4.8 5.1 0 5.1-6.8 10.1-6.8 10.1Z"
          fill="#9caf88"
          stroke="#3d5244"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M12 19.4V8" stroke="#3d5244" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </span>
  );
}
