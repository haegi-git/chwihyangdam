import { permanentRedirect } from "next/navigation";

export default function AdminCategoriesPage() {
  permanentRedirect("/admin?tab=categories");
}
