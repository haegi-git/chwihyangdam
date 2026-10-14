import { permanentRedirect } from "next/navigation";

export default function AdminPrefixesPage() {
  permanentRedirect("/admin/categories");
}
