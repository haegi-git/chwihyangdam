import DiaryBoard from "@/components/DiaryBoard";
import PageFrame from "@/components/PageFrame";

export const metadata = {
  title: "일기",
};

export default function DiaryPage() {
  return (
    <PageFrame narrow>
      <DiaryBoard />
    </PageFrame>
  );
}
