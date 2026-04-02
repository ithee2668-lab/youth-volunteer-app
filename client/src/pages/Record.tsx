import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { CORE_ISSUE_OPTIONS, ROUTINE_OPTIONS } from "@shared/schema";
import type { Record as VolRecord } from "@shared/schema";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Users, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function RecordPage() {
  const [, params] = useRoute("/record/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const volunteerId = getCurrentVolunteerId();
  const id = Number(params?.id);

  const { data: record, isLoading } = useQuery<VolRecord>({
    queryKey: ["/api/records", id],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId, "stats"] });
      toast({ title: "기록이 삭제되었습니다" });
      navigate("/");
    },
  });

  const toggleApproval = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/records/${id}`, {
        managerApproved: record?.managerApproved ? 0 : 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId, "stats"] });
    },
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">불러오는 중...</div>
    </div>
  );

  if (!record) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>기록을 찾을 수 없습니다</p>
    </div>
  );

  const issue = CORE_ISSUE_OPTIONS.find(o => o.value === record.coreIssue);
  const routineChecks: string[] = (() => {
    try { return JSON.parse(record.routineChecks); } catch { return []; }
  })();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-lg bg-white/20">
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => {
              if (confirm("이 기록을 삭제할까요?")) deleteMutation.mutate();
            }}
            className="p-1.5 rounded-lg bg-white/20 text-white/80 hover:bg-red-500/40"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <p className="text-sm opacity-70">
          {format(new Date(record.date), "yyyy년 M월 d일 EEEE", { locale: ko })}
        </p>
        <h1 className="text-xl font-bold mt-1">{record.branch}</h1>
        <p className="text-sm opacity-70">{record.affiliation}</p>
      </div>

      <div className="px-5 mt-5 space-y-4 animate-in">
        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users size={14} />
              <span className="text-xs">응대 청소년</span>
            </div>
            <p className="text-2xl font-bold text-primary">{record.youthCount}<span className="text-base font-normal ml-1">명</span></p>
          </div>
          <button
            onClick={() => toggleApproval.mutate()}
            data-testid="button-toggle-approval"
            className={`p-4 rounded-2xl border text-left transition-all ${
              record.managerApproved
                ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                : "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
            }`}
          >
            <div className={`flex items-center gap-1.5 mb-1 text-xs ${record.managerApproved ? "text-green-600 dark:text-green-400" : "text-orange-500"}`}>
              {record.managerApproved ? <CheckCircle size={14} /> : <XCircle size={14} />}
              <span className="font-medium">관리자 인증</span>
            </div>
            <p className={`text-sm font-bold ${record.managerApproved ? "text-green-700 dark:text-green-300" : "text-orange-600"}`}>
              {record.managerApproved ? "확인 완료" : "대기 중"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">탭하여 변경</p>
          </button>
        </div>

        {/* 핵심 이슈 */}
        {issue && (
          <div className={`p-4 rounded-2xl bg-issue-${record.coreIssue}`}>
            <p className="text-xs font-semibold opacity-70 mb-2">핵심 이슈</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{issue.emoji}</span>
              <p className="font-bold">{issue.label}</p>
            </div>
          </div>
        )}

        {/* 루틴 업무 */}
        <div className="p-4 rounded-2xl bg-card border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3">루틴 업무 완료</p>
          <div className="space-y-2">
            {ROUTINE_OPTIONS.map(opt => {
              const done = routineChecks.includes(opt);
              return (
                <div key={opt} className={`flex items-center gap-2.5 text-sm ${done ? "" : "opacity-40"}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                    done ? "bg-primary text-white" : "border border-border"
                  }`}>
                    {done ? "✓" : ""}
                  </div>
                  <span className={done ? "font-medium" : "text-muted-foreground"}>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 상황 및 대처 */}
        {record.situationAndAction && (
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">상황 및 나의 대처</p>
            <p className="text-sm leading-relaxed">{record.situationAndAction}</p>
          </div>
        )}

        {/* 관리자 정보 */}
        {record.managerName && (
          <div className="p-4 rounded-2xl bg-muted text-sm">
            <span className="text-muted-foreground">확인자: </span>
            <span className="font-medium">{record.managerName}</span>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
