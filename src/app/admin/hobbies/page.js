import { permanentRedirect } from "next/navigation";

export default function AdminHobbiesPage() {
  permanentRedirect("/admin?tab=hobbies");
}
