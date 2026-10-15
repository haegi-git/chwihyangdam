import { permanentRedirect } from "next/navigation";

export default function AdminModerationPage() {
  permanentRedirect("/admin?tab=reports");
}
