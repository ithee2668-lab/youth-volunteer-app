import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { getVerifiedFacilityCode } from "@/pages/AiChat";
import { ROUTINE_OPTIONS, CORE_ISSUE_OPTIONS, BRANCH_OPTIONS } from "@shared/schema";
import type { Volunteer } from "@shared/schema";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckSquare, AlertCircle, FileText, UserCheck, Sparkles, Send, Bot, User, X, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// ── AI 인라인 채팅 시트 컴포넌트 ─────────────────────────────────────────────
type ChatMsg = { role: "user" | "assistant"; content: string };

function AiWritingSheet({
  open, onClose,
  issueContext, issueLabel, currentDraft,
  volunteerId,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  issueContext: string;
  issueLabel: string;
  currentDraft: string;
  volunteerId: number | null;
  onApply: (text: string) => void;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(3);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 시트 열릴 때 AI 첫 메시지 자동 전송
  useEffect(() => {
    if (open && messages.length === 0) {
      sendToAI("__init__", []);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendToAI = async (userText: string, history: ChatMsg[]) => {
    setLoading(true);
    try {
      const newMessages: ChatMsg[] = userText === "__init__"
        ? [{ role: "user", content: `오늘 이슈: ${issueLabel || issueContext}. 기록 작성을 도와줘.` }]
        : [...history, { role: "user", content: userText }];

      const data = await apiRequest("POST", "/api/chat-inline", {
        volunteerId,
        messages: newMessages,
        issueContext,
        issueLabel,
        currentDraft,
        facilityCode: getVerifiedFacilityCode(),
      });

      if (data.limitReached) {
        toast({ title: "오늘 무료 사용량을 모두 사용했어요", description: "AI코칭 탭에서 시설 코드를 입력하면 무제한 이용 가능합니다", variant: "destructive" });
        onClose();
        return;
      }

      const assistantMsg: ChatMsg = { role: "assistant", content: data.reply };
      const displayHistory = userText === "__init__" ? [assistantMsg] : [...newMessages, assistantMsg];
      setMessages(displayHistory);
      if (data.suggestion) setSuggestion(data.suggestion);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch {
      toast({ title: "AI 응답 실패. 잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendToAI(text, messages);
  };

  if (!open) return null;

  return (
    <>
      {/* 딤 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* 슬라이드업 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "75vh" }}
      >
        {/* 시트 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <span className="font-semibold text-sm">AI와 함께 작성하기</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {remaining >= 999 ? "무제한" : `오늘 ${remaining}회 남음`}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"
              }`}>
                {msg.role === "user" ? <User size={13} /> : <Bot size={13} className="text-primary" />}
              </div>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-accent rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* 제안 문장 박스 */}
          {suggestion && (
            <div className="mx-1 p-3 rounded-xl bg-primary/8 border border-primary/30">
              <p className="text-xs font-semibold text-primary mb-1.5">✨ 완성된 문장 제안</p>
              <p className="text-sm leading-relaxed text-foreground">{suggestion}</p>
              <Button
                size="sm"
                className="w-full mt-2.5 gap-1.5"
                onClick={() => { onApply(suggestion); onClose(); }}
                data-testid="button-apply-suggestion"
              >
                <CheckCheck size={14} />
                이 문장으로 입력하기
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                <Bot size={13} className="text-primary" />
              </div>
              <div className="bg-accent px-3 py-2 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="간단히 말씀해주세요. 예) 닌텐도 순서 문제로 싸웠어요"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 min-h-[40px] max-h-[80px] text-sm resize-none"
              data-testid="input-inline-chat"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              data-testid="button-inline-send"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

const STEPS = [
  { id: 1, label: "기본 정보", icon: FileText },
  { id: 2, label: "루틴 업무", icon: CheckSquare },
  { id: 3, label: "핵심 이슈", icon: AlertCircle },
  { id: 4, label: "상세 기록", icon: FileText },
  { id: 5, label: "관리자 확인", icon: UserCheck },
];

export default function RecordFormPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const volunteerId = getCurrentVolunteerId();

  const [step, setStep] = useState(1);
  const [showAiSheet, setShowAiSheet] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    affiliation: "파주시청소년재단",
    branch: "",
    routineChecks: [] as string[],
    routineExtra: "",           // 추가 업무 서술란
    youthCount: 0,
    coreIssue: "",
    coreIssueCustom: "",        // 직접 기재 내용
    situationAndAction: "",
    managerApproved: false,
    managerName: "",
  });

  const { data: volunteer } = useQuery<Volunteer>({
    queryKey: ["/api/volunteers", volunteerId],
    enabled: !!volunteerId,
  });

  // 지점 자동 설정
  useState(() => {
    if (volunteer?.branch) setForm(f => ({ ...f, branch: volunteer.branch }));
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/records", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId, "records"] });
      toast({ title: "기록이 저장되었습니다 ✅" });
      navigate("/");
    },
    onError: () => {
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    },
  });

  const toggleRoutine = (val: string) => {
    setForm(f => ({
      ...f,
      routineChecks: f.routineChecks.includes(val)
        ? f.routineChecks.filter(r => r !== val)
        : [...f.routineChecks, val],
    }));
  };

  // 이슈별 placeholder 예시
  const ISSUE_PLACEHOLDER: Record<string, string> = {
    conflict:
      "예) 청소년 두 명이 닌텐도 순서 문제로 갈등이 발생했습니다. 저는 두 청소년을 잠시 분리해 각자의 이야기를 경청한 후, 교대 이용 규칙을 함께 정하도록 유도했습니다. 이후 두 청소년 모두 웃으며 게임을 즐겼습니다.",
    facility:
      "예) 보드게임 보관 선반의 나사가 풀려 기울어져 있었습니다. 즉시 이용을 제한하고 담당직원께 보고하여 안전테이프로 임시 조치 후 수리 요청을 남겼습니다. 이후 청소년들이 안전하게 이용할 수 있었습니다.",
    counseling:
      "예) 청소년 한 명이 진로 고민을 털어놓았습니다. 판단 없이 충분히 경청한 후, 비슷한 고민을 다룬 책을 소개하고 담당직원 상담 연계를 안내했습니다. 청소년이 '이야기해서 홀가분해졌다'고 했습니다.",
    routine:
      "예) 특별한 돌발 상황 없이 시설을 운영했습니다. 닌텐도·보드게임 대여 관리, 공간 정리정돈, 이용대장 기록을 순서대로 완료했고 청소년들이 안정적으로 시설을 이용했습니다.",
    custom:
      "예) 오늘 처음 방문한 청소년이 시설 이용 방법을 몰라 당황하는 모습을 발견했습니다. 시설 안내 투어를 제안해 공간별 이용 규칙을 설명했고, 청소년이 편안하게 적응할 수 있도록 도왔습니다.",
  };

  const effectiveCoreIssue = form.coreIssue === "custom" ? "custom" : form.coreIssue;

  const handleSubmit = () => {
    if (!form.coreIssue) {
      toast({ title: "핵심 이슈를 선택해주세요", variant: "destructive" });
      return;
    }
    if (form.coreIssue === "custom" && !form.coreIssueCustom.trim()) {
      toast({ title: "이슈 내용을 직접 입력해주세요", variant: "destructive" });
      return;
    }
    // 루틴업무에 추가 서술이 있으면 routineChecks에 포함
    const allRoutineChecks = form.routineExtra.trim()
      ? [...form.routineChecks, `기타: ${form.routineExtra.trim()}`]
      : form.routineChecks;
    // 직접 기재인 경우 coreIssue 값 처리
    const finalCoreIssue = form.coreIssue === "custom"
      ? `직접기재: ${form.coreIssueCustom.trim()}`
      : form.coreIssue;
    createMutation.mutate({
      volunteerId,
      date: form.date,
      affiliation: form.affiliation,
      branch: form.branch || volunteer?.branch || "",
      routineChecks: JSON.stringify(allRoutineChecks),
      youthCount: form.youthCount,
      coreIssue: finalCoreIssue,
      situationAndAction: form.situationAndAction,
      managerApproved: form.managerApproved ? 1 : 0,
      managerName: form.managerName,
    });
  };

  const canNext = () => {
    if (step === 1) return form.date && form.branch;
    if (step === 2) return form.routineChecks.length > 0;
    if (step === 3) {
      if (!form.coreIssue) return false;
      if (form.coreIssue === "custom" && !form.coreIssueCustom.trim()) return false;
      return true;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/")} className="p-1.5 rounded-lg bg-white/20">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-lg">봉사 기록하기</h1>
        </div>

        {/* 스텝 프로그레스 */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 flex-1 ${
                s.id <= step ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
        <p className="text-xs opacity-70 mt-2">{step} / {STEPS.length} · {STEPS[step - 1].label}</p>
      </div>

      <div className="px-5 mt-5 animate-in">
        {/* STEP 1: 기본 정보 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">기본 정보</h2>
            <div className="space-y-2">
              <Label>봉사 날짜</Label>
              <Input
                type="date"
                data-testid="input-date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {form.date && format(new Date(form.date), "yyyy년 M월 d일 EEEE", { locale: ko })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>지점</Label>
              <Select
                value={form.branch || volunteer?.branch}
                onValueChange={val => setForm({ ...form, branch: val })}
              >
                <SelectTrigger data-testid="select-branch">
                  <SelectValue placeholder="지점 선택" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_OPTIONS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* STEP 2: 루틴 업무 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-lg">루틴 업무 체크</h2>
              <p className="text-sm text-muted-foreground mt-1">오늘 수행한 업무를 모두 선택하세요</p>
            </div>

            <div className="space-y-2.5">
              {ROUTINE_OPTIONS.map(opt => {
                const checked = form.routineChecks.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleRoutine(opt)}
                    data-testid={`routine-${opt}`}
                    className={`routine-checkbox w-full ${checked ? "checked" : ""}`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      checked ? "border-primary bg-primary" : "border-border"
                    }`}>
                      {checked && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`font-medium text-sm ${checked ? "text-primary" : ""}`}>
                      {opt}
                    </span>
                  </button>
                );
              })}

              {/* 추가 업무 서술란 */}
              <div className="mt-3 space-y-1.5">
                <Label className="text-sm text-muted-foreground">📝 추가 업무 (자유 서술)</Label>
                <Textarea
                  placeholder="예) 보드게임 정리, 닌텐도 배터리 교체, 책 재배치, 간식 행사 보조 등"
                  className="min-h-[80px] text-sm resize-none"
                  data-testid="textarea-routine-extra"
                  value={form.routineExtra}
                  onChange={e => setForm({ ...form, routineExtra: e.target.value })}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">{form.routineExtra.length}/200</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-accent border border-accent">
              <Label className="text-sm mb-2 block">응대한 청소년 수</Label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setForm(f => ({ ...f, youthCount: Math.max(0, f.youthCount - 1) }))}
                  className="w-11 h-11 rounded-xl border-2 border-border bg-card font-bold text-lg hover:border-primary transition-colors"
                >−</button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold text-primary">{form.youthCount}</span>
                  <span className="text-lg text-muted-foreground ml-1">명</span>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, youthCount: f.youthCount + 1 }))}
                  className="w-11 h-11 rounded-xl border-2 border-border bg-card font-bold text-lg hover:border-primary transition-colors"
                >+</button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">직접 입력도 가능해요</p>
              <Input
                type="number"
                className="mt-2 text-center"
                data-testid="input-youth-count"
                value={form.youthCount}
                onChange={e => setForm({ ...form, youthCount: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {/* STEP 3: 핵심 이슈 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-lg">오늘의 핵심 이슈</h2>
              <p className="text-sm text-muted-foreground mt-1">가장 기억에 남는 상황 하나를 선택하세요</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CORE_ISSUE_OPTIONS.map(opt => {
                const selected = form.coreIssue === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, coreIssue: opt.value, coreIssueCustom: "" })}
                    data-testid={`issue-${opt.value}`}
                    className={`issue-card ${selected ? "selected" : ""}`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className={`text-xs font-semibold text-center leading-tight ${selected ? "text-primary" : ""}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}

              {/* 직접 기재 카드 */}
              <button
                onClick={() => setForm({ ...form, coreIssue: "custom" })}
                data-testid="issue-custom"
                className={`issue-card col-span-2 flex-row gap-3 justify-start px-4 ${
                  form.coreIssue === "custom" ? "selected" : ""
                }`}
              >
                <span className="text-3xl">✏️</span>
                <span className={`text-xs font-semibold leading-tight ${
                  form.coreIssue === "custom" ? "text-primary" : ""
                }`}>
                  해당 없음 — 직접 기재
                </span>
              </button>
            </div>

            {/* 직접 기재 입력란 */}
            {form.coreIssue === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-sm">이슈 내용을 직접 입력하세요</Label>
                <Textarea
                  placeholder="예) 신규 방문 청소년 안내, 단체 방문 대응, 행사 준비 보조 등"
                  className="min-h-[80px] text-sm resize-none"
                  data-testid="textarea-issue-custom"
                  value={form.coreIssueCustom}
                  onChange={e => setForm({ ...form, coreIssueCustom: e.target.value })}
                  maxLength={100}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-right">{form.coreIssueCustom.length}/100</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: 상세 기록 */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-lg">상황 및 나의 대처</h2>
              <p className="text-sm text-muted-foreground mt-1">
                직접 작성하거나, AI와 대화해서 다듬을 수 있어요
              </p>
            </div>

            {/* 이슈 배지 + AI 버튼 나란히 */}
            <div className="flex items-center gap-2">
              {form.coreIssue && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-0 ${
                  form.coreIssue === "custom" ? "bg-accent" : `bg-issue-${form.coreIssue}`
                }`}>
                  <span className="text-lg flex-shrink-0">
                    {form.coreIssue === "custom"
                      ? "✏️"
                      : CORE_ISSUE_OPTIONS.find(o => o.value === form.coreIssue)?.emoji}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {form.coreIssue === "custom"
                      ? (form.coreIssueCustom || "직접 기재")
                      : CORE_ISSUE_OPTIONS.find(o => o.value === form.coreIssue)?.label}
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowAiSheet(true)}
                data-testid="button-ai-writing"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0 shadow-sm active:scale-95 transition-transform"
              >
                <Sparkles size={14} />
                AI 작성
              </button>
            </div>

            {/* STAR 가이드 접이식 */}
            <details className="group">
              <summary className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none list-none">
                <span className="font-semibold">✍️ STAR 기법 가이드 보기</span>
                <span className="group-open:rotate-180 transition-transform inline-block">▾</span>
              </summary>
              <div className="mt-2 p-3 rounded-xl bg-accent text-xs text-muted-foreground space-y-0.5">
                <p>📍 Situation: 어떤 상황이었나요?</p>
                <p>🎯 Task: 내 역할/과제는?</p>
                <p>⚡ Action: 어떻게 행동했나요?</p>
                <p>✅ Result: 결과는 어땠나요?</p>
              </div>
            </details>

            <Textarea
              placeholder={ISSUE_PLACEHOLDER[effectiveCoreIssue] ?? "무슨 일이 있었고, 어떻게 행동했는지 150자 내외로 기록하세요"}
              className="min-h-[140px] text-sm leading-relaxed resize-none"
              data-testid="textarea-situation"
              value={form.situationAndAction}
              onChange={e => setForm({ ...form, situationAndAction: e.target.value })}
              maxLength={300}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>이력서·포트폴리오의 핵심 데이터가 됩니다</span>
              <span className={form.situationAndAction.length > 200 ? "text-orange-500" : ""}>
                {form.situationAndAction.length}/300
              </span>
            </div>

            {/* AI 인라인 작성 시트 */}
            <AiWritingSheet
              open={showAiSheet}
              onClose={() => setShowAiSheet(false)}
              issueContext={form.coreIssue}
              issueLabel={
                form.coreIssue === "custom"
                  ? form.coreIssueCustom
                  : CORE_ISSUE_OPTIONS.find(o => o.value === form.coreIssue)?.label || ""
              }
              currentDraft={form.situationAndAction}
              volunteerId={volunteerId}
              onApply={(text) => setForm(f => ({ ...f, situationAndAction: text }))}
            />
          </div>
        )}

        {/* STEP 5: 관리자 인증 */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-lg">관리자 인증</h2>
              <p className="text-sm text-muted-foreground mt-1">
                담당직원께 확인을 받으면 포트폴리오 신뢰도가 높아져요
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">✅ 인증의 효과</p>
              <p className="text-xs text-green-700 dark:text-green-400">학교 제출, 공모전 증빙, 취업 서류에서 공신력 있는 증거가 됩니다</p>
            </div>

            {/* 인증 여부 토글 */}
            <button
              onClick={() => setForm(f => ({ ...f, managerApproved: !f.managerApproved }))}
              data-testid="toggle-manager-approved"
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                form.managerApproved
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  form.managerApproved ? "border-primary bg-primary text-white" : "border-border"
                }`}>
                  {form.managerApproved ? "✓" : ""}
                </div>
                <div>
                  <p className="font-semibold">{form.managerApproved ? "관리자 확인 완료" : "관리자 확인 대기 중"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.managerApproved ? "나중에 변경 가능합니다" : "나중에 확인받아도 됩니다"}
                  </p>
                </div>
              </div>
            </button>

            {form.managerApproved && (
              <div className="space-y-2">
                <Label>확인자 이름 (선택)</Label>
                <Input
                  data-testid="input-manager-name"
                  placeholder="홍길동 팀장"
                  value={form.managerName}
                  onChange={e => setForm({ ...form, managerName: e.target.value })}
                />
              </div>
            )}

            {/* 요약 미리보기 */}
            <div className="p-4 rounded-2xl bg-muted space-y-2 text-sm">
              <p className="font-bold mb-3">기록 요약</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">날짜</span>
                <span className="font-medium">{form.date && format(new Date(form.date), "yyyy.MM.dd", { locale: ko })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">지점</span>
                <span className="font-medium">{form.branch || volunteer?.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">응대 청소년</span>
                <span className="font-medium">{form.youthCount}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">루틴 업무</span>
                <span className="font-medium">{form.routineChecks.length}개 완료</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">핵심 이슈</span>
                <span className="font-medium">
                  {form.coreIssue === "custom"
                    ? (form.coreIssueCustom || "직접 기재")
                    : (CORE_ISSUE_OPTIONS.find(o => o.value === form.coreIssue)?.label ?? "-")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 다음/완료 버튼 */}
        <div className="mt-6">
          {step < 5 ? (
            <Button
              className="w-full h-12 text-base font-semibold"
              data-testid="button-next-step"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
            >
              다음 →
            </Button>
          ) : (
            <Button
              className="w-full h-12 text-base font-semibold"
              data-testid="button-submit-record"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "저장 중..." : "기록 저장하기 ✅"}
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
