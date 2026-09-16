import FriendsBoard from "@/components/FriendsBoard";
import PageFrame from "@/components/PageFrame";

export const metadata = {
  title: "친구",
};

export default function FriendsPage() {
  return (
    <PageFrame>
      <FriendsBoard />
    </PageFrame>
  );
}
