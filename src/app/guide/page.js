// DRAFT: 변호사 검토 전 초안입니다. 화면에 보이지 않습니다. 운영자 이름과 문의 이메일을 넣은 뒤 게시하세요.
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";

export const metadata = {
  title: "운영 정책",
};

const sections = [
  {
    id: "tone",
    title: "말의 온도",
    body: (
      <>
        <p>
          취향담은 조용히 취미를 나누는 자리입니다. 의견이 달라도 사람 자체를 깎지 않습니다. 직설적인
          취미 이야기와 은어는 괜찮고, 모욕과 조롱은 그렇지 않습니다.
        </p>
      </>
    ),
  },
  {
    id: "banned",
    title: "남기지 않는 것",
    body: (
      <>
        <p>아래 내용은 글, 댓글, 프로필, 일기의 공개 범위와 상관없이 두지 않습니다.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>혐오, 욕설, 인신공격</li>
          <li>근거 없는 비난과 모욕</li>
          <li>싸움을 부추기는 말</li>
          <li>스팸, 광고, 같은 내용의 반복</li>
          <li>다른 사람의 개인정보를 올리는 일</li>
          <li>불법 촬영물, 아동·청소년 대상의 성적 내용, 범죄를 돕는 내용</li>
        </ul>
      </>
    ),
  },
  {
    id: "report",
    title: "신고",
    body: (
      <>
        <p>
          글, 댓글, 다른 사람의 프로필에서 신고할 수 있습니다. 이유는 혐오·욕설, 근거 없는 비난,
          싸움 걸기, 스팸, 그 밖의 이유 가운데 하나입니다. 짧은 설명을 더할 수 있습니다.
        </p>
        <p>
          내가 쓴 글과 댓글, 나 자신은 신고하지 않습니다. 같은 대상은 한 번만 신고합니다. 하루에는
          열 건까지입니다.
        </p>
      </>
    ),
  },
  {
    id: "review",
    title: "가림과 검토",
    body: (
      <>
        <p>
          서로 다른 다섯 명이 같은 글이나 댓글을 신고하면 그 내용은 자동으로 가려집니다. 작성한
          사람과 운영자는 계속 볼 수 있습니다. 사용자를 다섯 명이 신고해도 계정은 자동으로 정지되지
          않고, 운영자의 검토 목록에만 올라갑니다.
        </p>
        <p>운영자는 대상마다 다음 가운데 하나를 정합니다.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>유지. 가림을 풀고 신고를 접습니다.</li>
          <li>숨김 확정. 목록에서 보이지 않게 둡니다.</li>
          <li>삭제. 그 글이나 댓글만 거둡니다. 계정은 막지 않습니다.</li>
        </ul>
        <p>
          운영자가 원하면 신고된 내용을 xAI 또는 OpenAI에 보내 초안 의견을 받을 수 있습니다. 초안은
          참고이고, 숨기거나 지우는 결정은 사람이 합니다.
        </p>
      </>
    ),
  },
  {
    id: "suspend",
    title: "정지",
    body: (
      <>
        <p>
          반복해서 자리를 어지럽히면 계정을 정지할 수 있습니다. 정지된 동안에는 새 글과 새 댓글을
          남길 수 없습니다. 일기를 비롯해 이미 있는 기록은 정지 자체로 삭제되지 않습니다.
        </p>
        <p>정지는 풀 수 있습니다. 풀리면 다시 글을 남길 수 있습니다.</p>
      </>
    ),
  },
  {
    id: "diary",
    title: "일기와 차단",
    body: (
      <>
        <p>
          일기는 기본적으로 나만 봅니다. 친구 공개는 그 친구에게 일기 공유를 허용한 경우에만
          열립니다. 공개 범위를 바꾸면 그 날의 일기에만 적용됩니다.
        </p>
        <p>
          차단은 서로에게 적용됩니다. 차단 중에는 상대의 글이 보이지 않고 친구 요청도 오가지
          않습니다. 약관은{" "}
          <Link href="/terms" className="text-sage-deep underline-offset-4 hover:underline">
            이용약관
          </Link>
          , 정보 처리는{" "}
          <Link href="/privacy" className="text-sage-deep underline-offset-4 hover:underline">
            개인정보처리방침
          </Link>
          에 있습니다.
        </p>
      </>
    ),
  },
];

export default function GuidePage() {
  return (
    <LegalDocument
      kicker="운영"
      title="운영 정책"
      lede="어떤 말을 남기고, 신고가 들어오면 어떻게 살펴보는지를 적었습니다."
      sections={sections}
    />
  );
}
