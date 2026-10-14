import { permanentRedirect } from "next/navigation";

export default function LegacyHobbyTagNewPage() {
  permanentRedirect("/hobbies/new");
}