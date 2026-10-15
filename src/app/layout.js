import { Gaegu, Noto_Sans_KR } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import TermsConsentGate from "@/components/TermsConsent";
import "./globals.css";

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans-kr",
  weight: ["400", "500", "700"],
});

const hand = Gaegu({
  subsets: ["latin"],
  variable: "--font-hand",
  weight: ["400", "700"],
});

export const metadata = {
  title: {
    default: "취향담",
    template: "%s · 취향담",
  },
  description:
    "조용한 취향을 위한 작은 자리. 마이너 취미 커뮤니티와 기본적으로 비공개인 일기. 친구가 고른 날만 나눕니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${sans.variable} ${hand.variable} h-full`}>
      <body className="relative flex min-h-full flex-col bg-paper font-sans text-ink antialiased">
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <SiteHeader />
          <main className="relative flex-1">{children}</main>
          <SiteFooter />
          <BottomNav />
          <TermsConsentGate />
        </div>
      </body>
    </html>
  );
}
