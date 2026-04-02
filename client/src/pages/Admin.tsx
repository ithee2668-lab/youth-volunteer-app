import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, ClipboardList, MessageSquare, LogOut,
  CheckCircle2, XCircle, Star, ChevronDown, ChevronUp,
  Shield, KeyRound, Plus, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Volunteer, Record, SurveyResponse, FacilityCode } from "@shared/schema";

// ── 상수 (에러 교정 완료) ──────────────────────────────────────────────────
const CORE_ISSUE_LABELS: { [key: string]: string } = {
  conflict: "⚡ 갈등·분쟁",
  facility: "🔧 시설·안전",
  counseling: "💬 상담·지원",
  routine: "✅ 일상·운영",
};
const ROUTINE_LABELS: { [key: string]: string } = {
  "상시이용시설(공간,콘텐츠) 관리": "시설관리",
  "이용자/이용대장 관리": "이용대장",
  "환경개선 및 안전점검": "환경개선",
};

// ── 로그인 화면 ────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/admin/login", { password: pw });
      onLogin(pw);
    } catch {
      setError("비밀번호가 올바르지 않습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-1">관리자 페이지</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">청소년자유공간 봉사 기록 관리</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">관리자 비밀번호</label>
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading || !pw}>
            {loading ? "확인 중..." : "로그인"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6">
          초기 비밀번호: <span className="font-mono font-semibold">admin1234</span>
        </p>
      </div>
    </div>
  );
}

// ── 봉사자 목록 탭 (지점별 현황판으로 업그레이드) ───────────────────────────
function VolunteersTab({ password }: { password: string }) {
  const { data: volunteers = [], isLoading: vLoading } = useQuery<Volunteer[]>({
    queryKey: ["/api/admin/volunteers"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/volunteers", undefined, {
        "x-admin-password": password,
      }),
  });

  const { data: records = [], isLoading: rLoading } = useQuery<Record[]>({
    queryKey: ["/api/admin/records"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/records", undefined, {
        "x-admin-password": password,
      }),
  });

  if (vLoading || rLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  // 지점 목록 자동 추출
  const branches = ["쉼표 5호점(금촌)", "쉼표 7호점(운정)"];

  return (
    <div className="mt-4 space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <StatMini label="전체 봉사자" value={volunteers.length} />
        <StatMini label="서약 완료" value={volunteers.filter((v) => v.pledgeSigned).length} />
        <StatMini label="OT 완료" value={volunteers.filter((v) => v.orientationDone).length} />
      </div>

      {/* 지점별 그룹화 출력 */}
      {branches.map((branch) => {
        const branchVolunteers = volunteers.filter((v) => v.branch === branch);
        
        return (
          <div key={branch} className="space-y-3">
            <h3 className="font-bold text-sm text-slate-700 flex items-center gap-1.5 mt-2 border-b pb-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> 
              {branch} 
              <Badge variant="secondary" className="ml-1 text-[10px]">{branchVolunteers.length}명</Badge>
            </h3>

            {branchVolunteers.length === 0 ? (
              <EmptyState message="해당 지점에 등록된 봉사자가 없습니다" />
            ) : (
              branchVolunteers.map((v) => {
                // 해당 봉사자의 가장 최근 기록 추출
                const vRecords = records
                  .filter((r) => r.volunteerId === v.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestRecord = vRecords[0];

                return (
                  <Card key={v.id} className="overflow-hidden border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {v.university} {v.major}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {v.grade} · 시작일: {v.startDate}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0 items-end">
                          <StatusBadge ok={!!v.orientationDone} label="OT" />
                          <StatusBadge ok={!!v.pledgeSigned} label="서약서" />
                        </div>
                      </div>
                      
                      {/* 최근 특이사항 연동 블록 */}
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                        <p className="text-[11px] font-medium text-slate-500 mb-1">최근 활동 및 특이사항</p>
                        {latestRecord ? (
                          <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                            {latestRecord.situationAndAction || "특이사항 없이 일상 운영 완료."}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">아직 활동 기록이 없습니다.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 봉사 기록 탭 ───────────────────────────────────────────────────────────
function RecordsTab({ password }: { password: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: records = [], isLoading } = useQuery<Record[]>({
    queryKey: ["/api/admin/records"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/records", undefined, {
        "x-admin-password": password,
      }),
  });

  const { data: volunteers = [] } = useQuery<Volunteer[]>({
    queryKey: ["/api/admin/volunteers"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/volunteers", undefined, {
        "x-admin-password": password,
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const getVolunteer = (vid: number) => volunteers.find((v) => v.id === vid);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatMini label="총 기록" value={records.length} />
        <StatMini label="관리자 인증" value={records.filter((r) => r.managerApproved).length} />
        <StatMini label="총 청소년" value={records.reduce((s, r) => s + r.youthCount, 0)} />
      </div>

      {records.length === 0 ? (
        <EmptyState message="등록된 봉사 기록이 없습니다" />
      ) : (
        records.map((r) => {
          const v = getVolunteer(r.volunteerId);
          const isOpen = expanded === r.id;
          let routines: string[] = [];
          try { routines = JSON.parse(r.routineChecks); } catch {}

          return (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-0">
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.date}</span>
                        <span className="text-xs text-muted-foreground">{r.branch}</span>
                      </div>
                      {v && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {v.university} {v.major} {v.grade}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {CORE_ISSUE_LABELS[r.coreIssue] ?? r.coreIssue}
                        </Badge>
                        <span className="text-xs text-muted-foreground">청소년 {r.youthCount}명</span>
                        {r.managerApproved ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3 text-sm">
                    {routines.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">루틴 업무</p>
                        <div className="flex flex-wrap gap-1.5">
                          {routines.map((rt) => (
                            <Badge key={rt} variant="outline" className="text-xs">{ROUTINE_LABELS[rt] ?? rt}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.situationAndAction && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">상황 및 대처</p>
                        <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3">{r.situationAndAction}</p>
                      </div>
                    )}
                    {r.managerApproved && r.managerName && (
                      <p className="text-xs text-muted-foreground">인증 담당직원: {r.managerName}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ── 설문 탭 ───────────────────────────────────────────────────────────────
function SurveysTab({ password }: { password: string }) {
  const { data: surveys = [], isLoading } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/admin/surveys"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/surveys", undefined, {
        "x-admin-password": password,
      }),
  });

  const { data: volunteers = [] } = useQuery<Volunteer[]>({
    queryKey: ["/api/admin/volunteers"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/volunteers", undefined, {
        "x-admin-password": password,
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const avgRating = surveys.length > 0
    ? (surveys.reduce((s, sv) => s + sv.helpfulRating, 0) / surveys.length).toFixed(1)
    : "—";

  const getVolunteer = (vid: number) => volunteers.find((v) => v.id === vid);
  const slideLabels = ["전반적 이해", "역할 이해", "위기대응", "기록 방법", "포트폴리오 활용"];

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatMini label="총 응답 수" value={surveys.length} />
        <StatMini label="평균 별점" value={`${avgRating} / 5`} isText />
      </div>

      {surveys.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">슬라이드별 도움도 (체크 비율)</p>
            <div className="space-y-2">
              {slideLabels.map((label, i) => {
                const key = `helpfulSlide${i + 1}` as keyof SurveyResponse;
                const count = surveys.filter((s) => s[key]).length;
                const pct = Math.round((count / surveys.length) * 100);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {surveys.length === 0 ? (
        <EmptyState message="아직 설문 응답이 없습니다" />
      ) : (
        surveys.map((sv) => {
          const v = getVolunteer(sv.volunteerId);
          return (
            <Card key={sv.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    {v && <p className="text-xs font-medium">{v.university} {v.major} {v.grade}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(sv.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < sv.helpfulRating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                    ))}
                  </div>
                </div>
                {sv.question ? (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">남긴 의견</p>
                    <p className="text-sm leading-relaxed">{sv.question}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">의견 없음</p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ── 재사용 소형 컴포넌트 ──────────────────────────────────────────────────
function StatMini({ label, value, isText }: { label: string; value: string | number; isText?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className={`font-bold ${isText ? "text-base" : "text-xl"} text-primary`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${ok ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />} {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="py-12 text-center text-muted-foreground text-sm">{message}</div>;
}

// ── 시설 코드 탭 ───────────────────────────────────────────────────────────
function FacilityCodesTab({ password }: { password: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const { data: codes = [], isLoading } = useQuery<FacilityCode[]>({
    queryKey: ["/api/admin/facility-codes"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/facility-codes", undefined, {
        "x-admin-password": password,
      }).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/facility-codes",
        { code: newCode.toUpperCase(), facilityName: newName },
        { "x-admin-password": password }
      ).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/facility-codes"] });
      setNewCode(""); setNewName("");
      toast({ title: "코드가 발급되었습니다" });
    },
    onError: () => toast({ title: "코드 발급 실패", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/admin/facility-codes/${id}/deactivate`, undefined, {
        "x-admin-password": password,
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/facility-codes"] });
      toast({ title: "코드를 비활성화했습니다" });
    },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <p className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
          <Sparkles size={14} /> AI 코칭 코드 관리
        </p>
        <p className="text-xs text-amber-700">코드를 발급하면 해당 코드를 입력한 봉사자는 AI 코칭을 무제한 이용할 수 있습니다.</p>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
        <p className="font-semibold text-sm">새 시설 코드 발급</p>
        <div className="flex gap-2">
          <Input placeholder="코드 (예: PAJU01)" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} className="flex-1 font-mono tracking-widest" maxLength={10} />
          <Input placeholder="시설명" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" />
        </div>
        <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || newCode.length < 4}>
          <Plus size={16} className="mr-1" /> {createMutation.isPending ? "발급 중..." : "코드 발급"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : codes.length === 0 ? (
        <EmptyState message="발급된 코드가 없습니다" />
      ) : (
        codes.map(c => (
          <div key={c.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${c.isActive ? "bg-card border-border" : "bg-muted/50 border-muted"}`}>
            <div>
              <p className={`font-mono font-bold text-base tracking-widest ${c.isActive ? "text-primary" : "text-muted-foreground line-through"}`}>{c.code}</p>
              <p className="text-xs text-muted-foreground">{c.facilityName || "시설명 없음"} · {new Date(c.createdAt).toLocaleDateString("ko-KR")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "활성" : "비활성"}</Badge>
              {c.isActive && (
                <Button size="sm" variant="outline" onClick={() => deactivateMutation.mutate(c.id)} disabled={deactivateMutation.isPending}>비활성화</Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── 메인 관리자 페이지 ────────────────────────────────────────────────────
type Tab = "volunteers" | "records" | "surveys" | "codes";

export default function Admin() {
  const [password, setPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("volunteers");

  if (!password) {
    return <AdminLogin onLogin={setPassword} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "volunteers", label: "봉사자현황", icon: <Users className="w-4 h-4" /> },
    { id: "records", label: "일지기록", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "surveys", label: "설문결과", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "codes", label: "AI코드", icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-slate-900 text-white px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="font-bold text-lg">쉼표 통합 관리자</span>
          </div>
          <button className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100 bg-white/10 px-3 py-1.5 rounded-full" onClick={() => setPassword(null)}>
            <LogOut className="w-3 h-3" /> 로그아웃
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">비밀번호 인증 완료 · 지점별 통합 현황판</p>
      </div>

      {/* 탭 내비게이션 */}
      <div className="flex border-b sticky top-0 bg-white z-10 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-colors ${
              tab === t.id ? "text-slate-900 border-b-2 border-slate-900 bg-slate-50/50" : "text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="px-4 pb-10">
        {tab === "volunteers" && <VolunteersTab password={password} />}
        {tab === "records" && <RecordsTab password={password} />}
        {tab === "surveys" && <SurveysTab password={password} />}
        {tab === "codes" && <FacilityCodesTab password={password} />}
      </div>
    </div>
  );
}