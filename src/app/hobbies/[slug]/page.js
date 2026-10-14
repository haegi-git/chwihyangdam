import { permanentRedirect } from "next/navigation";

export default function LegacyHobbyTagPage() {
  permanentRedirect("/hobbies");
}
