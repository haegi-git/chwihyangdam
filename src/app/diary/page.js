import DiaryBoard from "@/components/DiaryBoard";

export const metadata = {
  title: "일기",
};

export default function DiaryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
      <DiaryBoard />
    </div>
  );
}
