import Link from "next/link";

export default function PolicyNote() {
  return (
    <p className="mt-4 text-sm leading-7 text-ink-soft">
      존중하는 말로 적어 주세요. 기준은{" "}
      <Link href="/guide" className="text-sage-deep underline-offset-4 hover:underline">
        운영 정책
      </Link>
      에 있습니다.
    </p>
  );
}
