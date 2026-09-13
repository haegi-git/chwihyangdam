import PageFrame from "@/components/PageFrame";
import ProfilePanel from "@/components/ProfilePanel";

export const metadata = {
  title: "프로필",
};

export default function ProfilePage() {
  return (
    <PageFrame>
      <ProfilePanel />
    </PageFrame>
  );
}
