import AdminDenied from "@/components/AdminDenied";
import AdminSectionNav from "@/components/AdminSectionNav";
import BoardLabelManager from "@/components/BoardLabelManager";
import PageFrame from "@/components/PageFrame";
import { adminMetadata, readAdminGate } from "@/lib/admin-gate";
import { fetchHobbyTags } from "@/lib/hobbies";

export async function generateMetadata() {
  return adminMetadata("말머리");
}

export default async function AdminHobbiesPage() {
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

  const hobbies = await fetchHobbyTags(gate.supabase);

  return (
    <PageFrame>
      <p className="kicker rise-in">운영</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">말머리</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
        글 제목 앞에 붙는 취미 이름입니다. 끄면 칩과 글쓰기에서 사라지고, 이미 붙은 글의 기록은
        남습니다. 새 취미는 요청이 있을 때 여기에서 더합니다.
      </p>
      <AdminSectionNav current="/admin/hobbies" />
      <BoardLabelManager
        key={hobbies
          .map((hobby) => `${hobby.id}:${hobby.name}:${hobby.sort_order}:${hobby.is_active}`)
          .join("|")}
        items={hobbies}
        table="hobby_tags"
      />
    </PageFrame>
  );
}
