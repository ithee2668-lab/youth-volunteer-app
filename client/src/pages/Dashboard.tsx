import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { CORE_ISSUE_OPTIONS, ROUTINE_OPTIONS } from "@shared/schema";
import type { Volunteer, Record as VolRecord } from "@shared/schema";
import BottomNav from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, CheckCircle, TrendingUp, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const volunteerId = getCurrentVolunteerId();

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

  const approvedCount = records?.filter(r => r.managerApproved).length ?? 0;
  const approvalRate = stats?.totalSessions
    ? Math.round((approvedCount / stats.totalSessions) * 100)
    : 0;

  const issueLabel = (val: string) =>
    CORE_ISSUE_OPTIONS.find(o => o.value === val)?.label ?? val;
  const issueEmoji = (val: string) =>
    CORE_ISSUE_OPTIONS.find(o => o.value === val)?.emoji ?? "📌";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-8">
        <h1 className="text-xl font-bold mb-1">통계 대시보드</h1>
        <p className="text-sm opacity-70">
          {volunteer?.university} {volunteer?.major}님의 역량 분석
        </p>

        {/* 핵심 KPI */}
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {[
            { icon: Calendar, label: "총 봉사", value: stats?.totalSessions ?? 0, unit: "회" },
            { icon: Users, label: "응대 청소년", value: stats?.totalYouth ?? 0, unit: "명" },
            { icon: CheckCircle, label: "관리자 인증", value: approvalRate, unit: "%" },
          ].map(({ icon: Icon, label, value, unit }) => (
            <div key={label} className="bg-white/15 rounded-xl p-3">
              <Icon size={14} className="opacity-70 mb-1.5" />
              <p className="text-xl font-bold">{value}<span className="text-sm ml-0.5">{unit}</span></p>
              <p className="text-xs opacity-70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5 animate-in">
        {/* 역량 분석 */}
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> 역량 분석
          </h2>

          {/* NCS 역량 매핑 */}
          <div className="space-y-3">
            {[
              {
                skill: "문제해결능력",
                desc: "갈등·시설 문제 대처",
                count: (stats?.issueBreakdown?.conflict ?? 0) + (stats?.issueBreakdown?.facility ?? 0),
                color: "bg-red-400",
                max: stats?.totalSessions || 1,
              },
              {
                skill: "의사소통능력",
                desc: "청소년 진로·고민 상담",
                count: stats?.issueBreakdown?.counseling ?? 0,
                color: "bg-blue-400",
                max: stats?.totalSessions || 1,
              },
              {
                skill: "직업윤리·성실성",
                desc: "루틴 업무 완료 횟수",
                count: stats?.routineBreakdown?.["출입대장 확인"] ?? 0,
                color: "bg-green-400",
                max: stats?.totalSessions || 1,
              },
              {
                skill: "자원관리능력",
                desc: "시설 환경 정비",
                count: stats?.routineBreakdown?.["환경정비 및 안전순찰"] ?? 0,
                color: "bg-yellow-400",
                max: stats?.totalSessions || 1,
              },
            ].map(({ skill, desc, count, color, max }) => (
              <div key={skill}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-semibold">{skill}</span>
                    <span className="text-xs text-muted-foreground ml-2">{desc}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{count}회</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, (count / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 이슈 분포 */}
        {stats?.issueBreakdown && Object.keys(stats.issueBreakdown).length > 0 && (
          <div className="p-4 rounded-2xl bg-card border border-border">
            <h2 className="font-bold mb-4">이슈 분포</h2>
            <div className="space-y-2.5">
              {CORE_ISSUE_OPTIONS.map(opt => {
                const cnt = stats.issueBreakdown[opt.value] ?? 0;
                const pct = stats.totalSessions ? Math.round((cnt / stats.totalSessions) * 100) : 0;
                return (
                  <div key={opt.value} className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center">{opt.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-muted-foreground">{cnt}회 ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-issue-${opt.value} transition-all duration-500`}
                          style={{ width: `${pct}%`, background: opt.value === "conflict" ? "#e84d4d" : opt.value === "facility" ? "#f5a623" : opt.value === "counseling" ? "#4a90d9" : "#52c77b" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 전체 기록 목록 */}
        {records && records.length > 0 && (
          <div>
            <h2 className="font-bold mb-3">전체 봉사 기록 ({records.length}회)</h2>
            <div className="space-y-2">
              {records.map(r => {
                const issue = CORE_ISSUE_OPTIONS.find(o => o.value === r.coreIssue);
                return (
                  <Link key={r.id} href={`/record/${r.id}`}>
                    <div
                      data-testid={`record-row-${r.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-lg flex-shrink-0">
                        {issue?.emoji ?? "📝"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {format(new Date(r.date), "M/d (E)", { locale: ko })}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{issue?.label}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">{r.youthCount}명</p>
                        {r.managerApproved ? (
                          <span className="text-xs text-green-600">✓ 인증</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">대기</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
