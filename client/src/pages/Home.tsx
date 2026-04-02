import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { CORE_ISSUE_OPTIONS } from "@shared/schema";
import type { Volunteer, Record } from "@shared/schema";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, TrendingUp, Users, Calendar, ChevronRight, Sun, Moon, BookOpen, Pen, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

function ThemeToggle() {
  const toggle = () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
  };
  return (
    <button onClick={toggle} className="p-2 rounded-lg text-primary-foreground opacity-80 hover:opacity-100">
      <Sun size={18} className="dark:hidden" />
      <Moon size={18} className="hidden dark:block" />
    </button>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const volunteerId = getCurrentVolunteerId();

  useEffect(() => {
    if (!volunteerId) navigate("/setup");
  }, [volunteerId]);

  // 다크모드 초기화
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }, []);

  const { data: volunteer } = useQuery<Volunteer>({
    queryKey: ["/api/volunteers", volunteerId],
    enabled: !!volunteerId,
  });

  const { data: stats } = useQuery<{
    totalSessions: number;
    totalYouth: number;
    issueBreakdown: Record<string, number>;
    recentRecords: any[];
  }>({
    queryKey: ["/api/volunteers", volunteerId, "stats"],
    enabled: !!volunteerId,
  });

  const issueLabel = (val: string) =>
    CORE_ISSUE_OPTIONS.find(o => o.value === val)?.label ?? val;
  const issueEmoji = (val: string) =>
    CORE_ISSUE_OPTIONS.find(o => o.value === val)?.emoji ?? "📌";
  const issueClass = (val: string) => `bg-issue-${val}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 36 36" width="32" height="32" fill="none" aria-label="청소년자유공간 봉사 기록 앱">
              <rect width="36" height="36" rx="10" fill="white" fillOpacity="0.2"/>
              <path d="M18 8 C12 8 8 12 8 18 C8 24 12 28 18 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="18" cy="28" r="2.5" fill="white"/>
              <path d="M22 14 L26 18 L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-lg">청소년자유공간 봉사 기록 앱</span>
          </div>
          <ThemeToggle />
        </div>

        <div>
          <p className="text-sm opacity-75 mb-1">
            {format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </p>
          <h1 className="text-2xl font-bold">
            {volunteer ? `안녕하세요 👋` : "안녕하세요 👋"}
          </h1>
          <p className="text-sm opacity-75 mt-1">
            {volunteer ? `${volunteer.branch} · ${volunteer.major}` : ""}
          </p>
        </div>

        {/* 핵심 통계 */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <Calendar size={15} />
              <span className="text-xs">총 봉사 횟수</span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalSessions ?? 0}</p>
            <p className="text-xs opacity-70 mt-0.5">회</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <Users size={15} />
              <span className="text-xs">응대 청소년</span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalYouth ?? 0}</p>
            <p className="text-xs opacity-70 mt-0.5">명</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5 animate-in">
        {/* 오리엔테이션 / 서약서 배너 */}
        {volunteer && (!volunteer.orientationDone || !volunteer.pledgeSigned) && (
          <div className="space-y-2">
            {!volunteer.orientationDone && (
              <Link href="/orientation">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-amber-800 dark:text-amber-300">오리엔테이션 자료 확인하기</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">봉사 시작 전 필수 안내 자료입니다</p>
                  </div>
                  <ChevronRight size={16} className="text-amber-600 dark:text-amber-500" />
                </div>
              </Link>
            )}
            {volunteer.orientationDone && !volunteer.pledgeSigned && (
              <Link href="/pledge">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center flex-shrink-0">
                    <Pen size={20} className="text-blue-700 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-blue-800 dark:text-blue-300">행동 규범 서약서 작성</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">전자서명 후 봉사 기록을 시작하세요</p>
                  </div>
                  <ChevronRight size={16} className="text-blue-600 dark:text-blue-500" />
                </div>
              </Link>
            )}
          </div>
        )}
        {volunteer?.pledgeSigned && volunteer?.orientationDone && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
            <CheckCircle size={16} className="text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-medium">오리엔테이션 완료 · 서약서 제출 완료</p>
          </div>
        )}
        {/* 오늘 기록 버튼 */}
        <Link href="/record">
          <Button
            className="w-full h-14 text-base font-semibold gap-2 shadow-md"
            data-testid="button-new-record"
          >
            <PlusCircle size={20} />
            오늘 봉사 기록하기
          </Button>
        </Link>

        {/* 최근 기록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">최근 봉사 기록</h2>
            <Link href="/dashboard">
              <button className="text-xs text-primary flex items-center gap-1">
                전체 보기 <ChevronRight size={14} />
              </button>
            </Link>
          </div>

          {stats?.recentRecords && stats.recentRecords.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentRecords.map((r: any) => (
                <Link key={r.id} href={`/record/${r.id}`}>
                  <div
                    data-testid={`record-card-${r.id}`}
                    className="p-4 rounded-2xl border border-border bg-card hover:shadow-sm transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {format(new Date(r.date), "M월 d일 (EEEE)", { locale: ko })}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.branch}</p>
                      </div>
                      <Badge
                        className={`text-xs px-2 py-0.5 rounded-full ${issueClass(r.coreIssue)}`}
                        variant="secondary"
                      >
                        {issueEmoji(r.coreIssue)} {issueLabel(r.coreIssue)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {r.youthCount}명 응대
                      </span>
                      {r.managerApproved ? (
                        <span className="text-green-600 font-medium">✓ 관리자 확인</span>
                      ) : (
                        <span className="text-orange-500">⏳ 확인 대기</span>
                      )}
                    </div>
                    {r.situationAndAction && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        {r.situationAndAction}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm font-medium">아직 기록이 없어요</p>
              <p className="text-xs mt-1">첫 봉사 기록을 남겨보세요!</p>
            </div>
          )}
        </div>

        {/* 포트폴리오 바로가기 */}
        <Link href="/portfolio">
          <div className="p-4 rounded-2xl bg-secondary border border-secondary-foreground/10 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-secondary-foreground">포트폴리오 생성</p>
              <p className="text-xs text-muted-foreground mt-0.5">취업·공모전 제출용 PDF 보고서</p>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp size={18} />
              <ChevronRight size={16} />
            </div>
          </div>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
