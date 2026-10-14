import AdminDenied from "@/components/AdminDenied";
import AdminSectionNav from "@/components/AdminSectionNav";
import BoardLabelManager from "@/components/BoardLabelManager";
import PageFrame from "@/components/PageFrame";
import { adminMetadata, readAdminGate } from "@/lib/admin-gate";
import { fetchBoardCategories } from "@/lib/hobbies";

export async function generateMetadata() {
  return adminMetadata("분류");
}

export default async function AdminCategoriesPage() {
  const gate = await readAdminGate();

  if (gate.state === "offline") {
    return (
      <PageFrame>
        <AdminDenied
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
        />
      </PageFrame>
    );
  }

  if (gate.state !== "ok") {
    return (
      <PageFrame>
        <AdminDenied
          title="이 자리는 비어 있습니다"
          body="찾는 페이지가 없거나, 볼 수 있는 권한이 없습니다."
        />
      </PageFrame>
    );
  }

  const categories = await fetchBoardCategories(gate.supabase);

  return (
    <PageFrame>
      <p className="kicker rise-in">운영</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">분류</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
        취미 글을 나누는 칸입니다. 끄면 목록 탭과 글쓰기에서 사라지고, 이미 붙은 글은 그 분류를
        유지합니다.
      </p>
      <AdminSectionNav current="/admin/categories" />
      <BoardLabelManager
        key={categories
          .map((category) => `${category.id}:${category.name}:${category.sort_order}:${category.is_active}`)
          .join("|")}
        items={categories}
        table="board_categories"
      />
    </PageFrame>
  );
}
