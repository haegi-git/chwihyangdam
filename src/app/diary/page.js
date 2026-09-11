import DiaryBoard from "@/components/DiaryBoard";
import PageShell from "@/components/PageShell";

export const metadata = {
  title: "일기",
};

export default function DiaryPage() {
  return (
    <PageShell narrow>
      <DiaryBoard />
    </PageShell>
  );
}
