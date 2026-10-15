import { permanentRedirect } from "next/navigation";

export default function AdminReportsPage() {
  permanentRedirect("/admin?tab=reports");
}
