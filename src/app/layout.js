import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import CalmWash from "@/components/CalmWash";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans-kr",
  weight: ["400", "500", "700"],
});

const serif = Noto_Serif_KR({
  subsets: ["latin"],
  variable: "--font-serif-kr",
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: {
    default: "취향담",
    template: "%s · 취향담",
  },
  description:
    "조용한 취향을 위한 작은 자리. 마이너 취미 커뮤니티와 기본적으로 비공개인 일기.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${serif.variable} h-full`}
    >
      <body className="relative flex min-h-full flex-col overflow-x-hidden bg-paper font-sans text-ink antialiased">
        <CalmWash />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
