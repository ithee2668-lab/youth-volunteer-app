import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { ORIENTATION_SLIDES } from "@shared/schema";
import type { Volunteer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen } from "lucide-react";

// 슬라이드 콘텐츠 정의 (이미지 첨부 대신 구조화 콘텐츠)
const SLIDE_CONTENT = [
  // 슬라이드 1: 표지
  {
    type: "cover",
    logo: "Paju Youth",
    tag: "2026 청소년자유공간 쉼표",
    title: "주말 대학생 봉사자\n오리엔테이션",
    desc: "안전하고 따뜻한 청소년 공간을 함께 만들어갈 여러분을 환영합니다.\n아래 세 가지 원칙을 반드시 숙지하고 실천해야 하는 행동 기준입니다.",
    meta: "파주시청소년재단 · 운정청소년센터",
  },
  // 슬라이드 2: 환영 및 시설 안내
  {
    type: "welcome",
    title: "환영합니다: 청소년자유공간 쉼표",
    desc: "쉼표는 청소년이 자유롭게 머무르고 쉬며 성장하는 공간입니다.\n여러분은 이 공간의 안전한 운영을 돕는 중요한 동반자입니다.",
    items: [
      { icon: "📍", label: "5호점 (금촌)", desc: "평일·주말 운영, 게임·휴게 시설 보유" },
      { icon: "📍", label: "7호점 (운정)", desc: "주말 특화 운영, 독서·창작 시설 보유" },
    ],
    notice: "이 곳에서 활동하는 봉사자는 반드시 행동 규범을 준수해야 합니다.",
    highlight: "청소년과 단둘이 있는 상황, 사적 연락처 교환, 시설 밖 동행은 절대 금지입니다.",
  },
  // 슬라이드 3: 핵심 수칙 ①
  {
    type: "rule",
    badge: "핵심 수칙 ①",
    title: "청소년 응대 및\n전문적 경계",
    desc: "청소년과의 건강한 관계는 존중, 비밀보장, 명확한 경계에서 시작됩니다.\n아래 세 가지 원칙을 반드시 숙지하고 실천해야 합니다.",
    rules: [
      {
        icon: "🚫",
        title: "존중하는 언어 사용",
        points: ["비하·혐오 표현 금지", "별명/닉네임 사용 금지", "명령형보다 요청형으로"],
      },
      {
        icon: "🔒",
        title: "비밀유지 의무 유지",
        points: ["가정환경·성적 정보 비밀", "상담 내용 외부 유출 금지", "사진·영상 촬영 금지"],
      },
      {
        icon: "📵",
        title: "사적 연락 전면 금지",
        points: ["SNS·카톡 친구 추가 금지", "청소년 → 틱톡·릴스 팔로우 금지", "개인번호 교환 → 117 즉시 신고"],
      },
    ],
  },
  // 슬라이드 4: 핵심 수칙 ②
  {
    type: "safety",
    badge: "핵심 수칙 ②",
    title: "시설물 안전 및\n위기 대처",
    steps: [
      { num: "1", title: "위기 발생 인지 시", action: "담당직원께 구두 보고 (절대 혼자 처리 금지)" },
      { num: "2", title: "담당직원 보고", action: "상황 설명 → 지시에 따름" },
      { num: "3", title: "일일자 작성", action: "앱에 상황 기록 (G열·H열 반드시 기재)" },
    ],
    safetyCases: [
      { icon: "🚨", label: "폭력·위협 발생", action: "즉시 담당직원 호출 + 117 신고 준비" },
      { icon: "🔥", label: "화재·부상 발생", action: "대피 유도 후 119/담당직원 동시 연락" },
      { icon: "💬", label: "청소년 자해·위기 의심", action: "혼자 판단 금지 → 즉시 담당자 연결" },
    ],
  },
  // 슬라이드 5: 핵심 수칙 ③
  {
    type: "workflow",
    badge: "핵심 수칙 ③",
    title: "역할과 보고 체계",
    desc: "봉사 활동 중 발생하는 모든 상황을 체계적으로 기록하는 것이 핵심입니다.",
    flow: [
      { step: 1, title: "활동 시작", desc: "출입대장 확인 및 시설 점검" },
      { step: 2, title: "수시 구두 보고", desc: "이슈 발생 즉시 담당직원에게 보고" },
      { step: 3, title: "일일자 작성", desc: "활동 종료 전 앱에 정확히 기록" },
    ],
    icons: ["🚨 특이사항 발생", "💬 구두 보고", "📱 앱 일지 작성"],
  },
  // 슬라이드 6: 혜택
  {
    type: "benefit",
    title: "여러분을 위한 특별한 혜택",
    subtitle: "실포 플랫폼으로 이루는 특별 활용",
    benefits: [
      {
        icon: "📋",
        title: "3주 활동 기록시",
        desc: "봉사 증명서 자동 발급 + NCS 역량 요약본 제공",
      },
      {
        icon: "🎓",
        title: "데이터 신청서",
        desc: "취업·공모전에 활용 가능한 개인 활동 데이터 신청 가능",
      },
      {
        icon: "🏅",
        title: "공모전 및 보고서",
        desc: "활동 후 봉사 기록 PDF 자동 생성 제공",
      },
    ],
    cta: "이 앱에서 기록을 시작하면 모든 혜택이 자동으로 누적됩니다.",
  },
  // 슬라이드 7: Q&A + 서약 안내
  {
    type: "closing",
    title: "Q&A 및 행동 규범 서약",
    questions: [
      {
        icon: "🙋",
        q: "자주 묻는 질문",
        a: "수업 있는 주말에는 사전에 카카오톡 또는 문자로 담당자에게 연락해주세요.",
      },
      {
        icon: "📱",
        q: "앱 사용법",
        a: "이 앱에서 체크리스트·이슈 기록·관리자 인증까지 한번에 완료됩니다. 활동 종료 전 반드시 저장해주세요.",
      },
    ],
    nextStep: "오리엔테이션을 완료하셨습니다!\n다음 단계에서 행동 규범 서약서에 서명해주세요.",
    emoji: "🎉",
  },
];

export default function OrientationPage() {
  const [, navigate] = useLocation();
  const volunteerId = getCurrentVolunteerId();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [readSlides, setReadSlides] = useState<Set<number>>(new Set([0]));
  const total = SLIDE_CONTENT.length;
  const isLast = currentSlide === total - 1;
  const allRead = readSlides.size >= total;

  const { data: volunteer } = useQuery<Volunteer>({
    queryKey: ["/api/volunteers", volunteerId],
    enabled: !!volunteerId,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/volunteers/${volunteerId}`, {
        orientationDone: 1,
        orientationDoneAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId] });
      navigate("/survey");
    },
  });

  const goNext = () => {
    if (currentSlide < total - 1) {
      const next = currentSlide + 1;
      setCurrentSlide(next);
      setReadSlides(s => new Set([...s, next]));
    }
  };

  const goPrev = () => {
    if (currentSlide > 0) setCurrentSlide(s => s - 1);
  };

  const slide = SLIDE_CONTENT[currentSlide];
  const meta = ORIENTATION_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 상단 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm opacity-80"
          >
            <ArrowLeft size={16} /> 돌아가기
          </button>
          <div className="flex items-center gap-1.5 text-sm opacity-80">
            <BookOpen size={15} />
            <span>{currentSlide + 1} / {total}</span>
          </div>
        </div>
        {/* 프로그레스 바 */}
        <div className="flex gap-1">
          {SLIDE_CONTENT.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentSlide(i); setReadSlides(s => new Set([...s, i])); }}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < currentSlide ? "bg-white" : i === currentSlide ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
        <p className="text-xs mt-2 opacity-60">{readSlides.size}/{total} 슬라이드 확인</p>
      </div>

      {/* 슬라이드 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-5 py-5 animate-in" key={currentSlide}>
        <SlideRenderer slide={slide} />
      </div>

      {/* 하단 버튼 */}
      <div className="px-5 pb-8 pt-3 border-t border-border bg-background">
        <div className="flex gap-3">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={goPrev}
              className="flex-1 h-12"
              data-testid="button-prev-slide"
            >
              <ArrowLeft size={16} className="mr-1" /> 이전
            </Button>
          )}
          {!isLast ? (
            <Button
              onClick={goNext}
              className="flex-1 h-12 font-semibold"
              data-testid="button-next-slide"
            >
              다음 <ArrowRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => completeMutation.mutate()}
              className="flex-1 h-12 font-semibold gap-2"
              disabled={completeMutation.isPending}
              data-testid="button-complete-orientation"
            >
              <CheckCircle size={18} />
              {completeMutation.isPending ? "처리 중..." : "완료 → 서약서 작성"}
            </Button>
          )}
        </div>
        {isLast && !allRead && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            모든 슬라이드를 확인하면 완료 버튼이 활성화됩니다
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 슬라이드 렌더러 ───────────────────────────────────────
function SlideRenderer({ slide }: { slide: any }) {
  switch (slide.type) {
    case "cover":   return <SlideCover s={slide} />;
    case "welcome": return <SlideWelcome s={slide} />;
    case "rule":    return <SlideRule s={slide} />;
    case "safety":  return <SlideSafety s={slide} />;
    case "workflow":return <SlideWorkflow s={slide} />;
    case "benefit": return <SlideBenefit s={slide} />;
    case "closing": return <SlideClosing s={slide} />;
    default: return null;
  }
}

function SlideCover({ s }: any) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-primary text-primary-foreground p-6">
        <p className="text-xs font-semibold opacity-70 mb-3 tracking-widest uppercase">{s.logo}</p>
        <p className="text-sm opacity-80 mb-2">{s.tag}</p>
        <h1 className="text-2xl font-bold leading-tight whitespace-pre-line">{s.title}</h1>
        <p className="text-sm opacity-70 mt-4 leading-relaxed whitespace-pre-line">{s.desc}</p>
        <div className="mt-5 pt-4 border-t border-white/20 text-xs opacity-60">{s.meta}</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["청소년 응대 수칙", "시설 안전 관리", "기록 및 보고"].map((t, i) => (
          <div key={i} className="p-3 rounded-xl bg-card border border-border text-center">
            <div className="text-2xl mb-1">{["🤝","🔧","📋"][i]}</div>
            <p className="text-xs font-medium">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideWelcome({ s }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold leading-tight">{s.title}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{s.desc}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {s.items.map((item: any, i: number) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-border">
            <span className="text-2xl">{item.icon}</span>
            <p className="font-bold text-sm mt-2">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-xl bg-muted border border-border">
        <p className="text-xs text-muted-foreground">{s.notice}</p>
      </div>
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ 필수 준수사항</p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">{s.highlight}</p>
      </div>
    </div>
  );
}

function SlideRule({ s }: any) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{s.badge}</span>
        <h2 className="text-xl font-bold mt-3 whitespace-pre-line leading-tight">{s.title}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
      </div>
      {s.rules.map((rule: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{rule.icon}</span>
            <p className="font-bold text-sm">{rule.title}</p>
          </div>
          <ul className="space-y-1.5">
            {rule.points.map((pt: string, j: number) => (
              <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SlideSafety({ s }: any) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">{s.badge}</span>
        <h2 className="text-xl font-bold mt-3 whitespace-pre-line leading-tight">{s.title}</h2>
      </div>
      {/* 보고 플로우 */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-3">보고 절차</p>
        <div className="space-y-3">
          {s.steps.map((step: any, i: number) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">{step.num}</div>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 위기 상황별 대처 */}
      <p className="text-xs font-semibold text-muted-foreground">상황별 대처</p>
      {s.safetyCases.map((c: any, i: number) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
          <span className="text-xl flex-shrink-0">{c.icon}</span>
          <div>
            <p className="text-sm font-bold">{c.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.action}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SlideWorkflow({ s }: any) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">{s.badge}</span>
        <h2 className="text-xl font-bold mt-3 whitespace-pre-line leading-tight">{s.title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
      </div>
      {/* 플로우 스텝 */}
      <div className="space-y-2">
        {s.flow.map((f: any, i: number) => (
          <div key={i} className="flex gap-4 items-center p-4 rounded-xl bg-card border border-border">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-bold flex items-center justify-center flex-shrink-0">{f.step}</div>
            <div>
              <p className="font-semibold text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {/* 아이콘 플로우 */}
      <div className="flex items-center justify-around p-4 rounded-xl bg-muted">
        {s.icons.map((icon: string, i: number) => (
          <div key={i} className="flex items-center gap-1.5 text-xs font-medium">
            <span>{icon}</span>
            {i < s.icons.length - 1 && <span className="text-muted-foreground ml-1">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideBenefit({ s }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{s.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{s.subtitle}</p>
      </div>
      {s.benefits.map((b: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-card border border-border flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl flex-shrink-0">{b.icon}</div>
          <div>
            <p className="font-bold text-sm">{b.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
          </div>
        </div>
      ))}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
        <p className="text-sm font-medium text-primary text-center">{s.cta}</p>
      </div>
    </div>
  );
}

function SlideClosing({ s }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{s.title}</h2>
      {s.questions.map((q: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{q.icon}</span>
            <p className="font-bold text-sm">{q.q}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{q.a}</p>
        </div>
      ))}
      <div className="p-5 rounded-2xl bg-primary text-primary-foreground text-center">
        <div className="text-4xl mb-3">{s.emoji}</div>
        <p className="font-bold text-base leading-relaxed whitespace-pre-line">{s.nextStep}</p>
      </div>
    </div>
  );
}
