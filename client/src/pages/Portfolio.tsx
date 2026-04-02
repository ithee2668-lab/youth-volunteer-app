import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import type { Volunteer, Record as VolRecord } from "@shared/schema";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import {
  Download, FileText, Briefcase, Trophy, GraduationCap,
  ChevronDown, ChevronUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// 서버 API를 호출해 PDF를 직접 다운로드 (한글 완벽 지원)
// ─────────────────────────────────────────────────────────────────────────────
async function downloadPDF(volunteerId: number) {
  const res = await fetch(`./api/volunteers/${volunteerId}/pdf`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "PDF 생성 실패" }));
    throw new Error(err.message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const disp = res.headers.get("content-disposition") ?? "";
  const match = disp.match(/filename\*=UTF-8''(.+)/);
  a.download = match ? decodeURIComponent(match[1]) : "봉사포트폴리오.pdf";
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [, navigate] = useLocation();
  const volunteerId = getCurrentVolunteerId();
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("job");

  useEffect(() => {
    if (!volunteerId) navigate("/setup");
  }, [volunteerId]);

  const { data: volunteer } = useQuery<Volunteer>({
    queryKey: ["/api/volunteers", volunteerId],
    enabled: !!volunteerId,
  });

  const { data: stats } = useQuery<{
    totalSessions: number;
    totalYouth: number;
    issueBreakdown: { [key: string]: number };
    routineBreakdown: { [key: string]: number };
    recentRecords: VolRecord[];
  }>({
    queryKey: ["/api/volunteers", volunteerId, "stats"],
    enabled: !!volunteerId,
  });

  const { data: records } = useQuery<VolRecord[]>({
    queryKey: ["/api/volunteers", volunteerId, "records"],
    enabled: !!volunteerId,
  });

  const handleGeneratePDF = async () => {
    if (!volunteerId) return;
    setGenerating(true);
    try {
      await downloadPDF(volunteerId);
    } catch (e: any) {
      console.error(e);
      alert("PDF 생성 실패: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const useCases = [
    {
      id: "job",
      icon: Briefcase,
      title: "취업 자기소개서",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      points: [
        `NCS 문제해결능력: 갈등·시설 문제 ${((stats?.issueBreakdown?.conflict ?? 0) + (stats?.issueBreakdown?.facility ?? 0))}건 대처 경험`,
        `의사소통능력: 총 ${stats?.totalYouth ?? 0}명 청소년 응대 및 ${stats?.issueBreakdown?.counseling ?? 0}건 상담`,
        "PDF 보고서를 면접 포트폴리오로 직접 제출 가능",
      ],
    },
    {
      id: "contest",
      icon: Trophy,
      title: "공모전 현장 근거",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-200 dark:border-orange-800",
      points: [
        `"총 ${stats?.totalSessions ?? 0}회 봉사, ${stats?.totalYouth ?? 0}명 청소년 관찰" — 데이터 기반 기획의 근거`,
        "날짜별 이슈 데이터로 청소년 니즈 분석 가능",
        "심사위원에게 어필되는 현장 기반 신뢰도",
      ],
    },
    {
      id: "school",
      icon: GraduationCap,
      title: "전공 과제·실습",
      color: "text-green-700 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      points: [
        "상황 및 대처 기록 → 사례관리 관찰 보고서의 1차 데이터",
        "출입 관리·인력 배치 구조 분석 → 복지행정 과제",
        "루틴 데이터 → 행정 시스템 개선 보고서",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-8">
        <h1 className="text-xl font-bold mb-1">포트폴리오 생성</h1>
        <p className="text-sm opacity-70">취업·공모전·과제 제출용 자동 보고서</p>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          {[
            { label: "봉사 횟수", value: stats?.totalSessions ?? 0, unit: "회" },
            { label: "청소년 응대", value: stats?.totalYouth ?? 0, unit: "명" },
            { label: "에피소드", value: records?.filter((r) => r.situationAndAction).length ?? 0, unit: "건" },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-white/15 rounded-xl py-2.5">
              <p className="text-xl font-bold">
                {value}
                <span className="text-xs ml-0.5">{unit}</span>
              </p>
              <p className="text-xs opacity-70">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 animate-in">
        {/* PDF 다운로드 */}
        <div className="p-5 rounded-2xl bg-card border-2 border-primary/20 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold">자동 PDF 보고서 생성</h2>
              <p className="text-xs text-muted-foreground mt-1">
                누적된 모든 봉사 기록이 A4 보고서로 자동 정리됩니다
              </p>
            </div>
          </div>

          <div className="space-y-1.5 mb-4 text-sm">
            {[
              "봉사 요약 통계 및 KPI",
              "NCS 역량 매핑 증빙",
              "현장 에피소드 (STAR 기법)",
              "전체 활동 이력 테이블",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full h-12 text-base font-semibold gap-2"
            data-testid="button-generate-pdf"
            onClick={handleGeneratePDF}
            disabled={generating || !stats?.totalSessions}
          >
            <Download size={18} />
            {generating
              ? "PDF 생성 중... (잠시 기다려주세요)"
              : stats?.totalSessions
              ? "PDF 보고서 다운로드"
              : "기록이 없습니다"}
          </Button>

          {!stats?.totalSessions && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              봉사 기록을 먼저 입력해주세요
            </p>
          )}
        </div>

        {/* 활용 방법 아코디언 */}
        <h2 className="font-bold text-base">포트폴리오 활용 전략</h2>

        {useCases.map(({ id, icon: Icon, title, color, bg, border, points }) => (
          <div key={id} className={`rounded-2xl border ${border} ${bg} overflow-hidden`}>
            <button
              onClick={() => setActiveSection(activeSection === id ? null : id)}
              data-testid={`accordion-${id}`}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={color} />
                <span className={`font-semibold ${color}`}>{title}</span>
              </div>
              {activeSection === id ? (
                <ChevronUp size={16} className={color} />
              ) : (
                <ChevronDown size={16} className={color} />
              )}
            </button>

            {activeSection === id && (
              <div className="px-4 pb-4 space-y-2">
                {points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 flex-shrink-0 ${color}`}>→</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 자기소개서 문장 예시 */}
        {stats && stats.totalSessions > 0 && volunteer && (
          <div className="p-4 rounded-2xl bg-muted border border-border">
            <h3 className="font-bold text-sm mb-3">✍️ 자기소개서 문장 예시</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="bg-card p-3 rounded-xl border border-border leading-relaxed italic">
                "저는 {volunteer.branch}에서 총{" "}
                <strong className="text-foreground">{stats.totalSessions}회</strong>의 주말 봉사를 통해{" "}
                <strong className="text-foreground">{stats.totalYouth}명</strong>의 청소년을 직접
                만났습니다. 이 과정에서 갈등 중재 {stats.issueBreakdown?.conflict ?? 0}건, 진로 상담{" "}
                {stats.issueBreakdown?.counseling ?? 0}건을 처리하며 문제해결능력과 의사소통능력을
                실증적으로 키웠습니다."
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
