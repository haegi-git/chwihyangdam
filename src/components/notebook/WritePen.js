import Link from "next/link";

export default function WritePen({ href, label = "글 남기기" }) {
  return (
    <Link href={href} className="write-pen md:hidden" aria-label={label}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
        <path
          d="M13.2 6.2 17.8 10.8 8.4 20.2H3.8v-4.6L13.2 6.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="m15.4 4 4.6 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
