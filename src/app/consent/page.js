import { TermsConsentPanel } from "@/components/TermsConsent";
import PageFrame from "@/components/PageFrame";

export const metadata = {
  title: "동의",
};

export default function ConsentPage() {
  return (
    <PageFrame narrow>
      <div className="flex justify-center">
        <TermsConsentPanel />
      </div>
    </PageFrame>
  );
}
