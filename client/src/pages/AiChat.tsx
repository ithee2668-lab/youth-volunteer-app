import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Bot, User, Sparkles, Lock, KeyRound } from "lucide-react";
import type { AiChat } from "@shared/schema";

// 시설 코드를 서버에서 검증 (세션 중 유지)
let _verifiedCode: string | null = null;
export function getVerifiedFacilityCode() { return _verifiedCode; }
export function setVerifiedFacilityCode(c: string | null) { _verifiedCode = c; }

const FREE_LIMIT = 10;

export default function AiChatPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const volunteerId = getCurrentVolunteerId();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(!!_verifiedCode);
  const [remaining, setRemaining] = useState(FREE_LIMIT);
  const [verifying, setVerifying] = useState(false);

  // 채팅 기록
  const { data: history = [] } = useQuery<AiChat[]>({
    queryKey: ["/api/volunteers", volunteerId, "chat-history"],
    queryFn: () => apiRequest("GET", `/api/volunteers/${volunteerId}/chat-history`),
    enabled: !!volunteerId,
  });

  // 최근 봉사 기록에서 이슈 컨텍스트 가져오기
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/volunteers", volunteerId, "stats"],
    enabled: !!volunteerId,
  });
  const lastIssue = stats?.recentRecords?.[0]?.coreIssue || "";

  // 채팅 전송
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", "/api/chat", {
        volunteerId,
        message,
        facilityCode: _verifiedCode,
        issueContext: lastIssue,
      }),
    onSuccess: (data) => {
      if (data.limitReached) {
        toast({ title: "무료 사용량 소진", description: "시설 코드를 입력하면 무제한으로 이용할 수 있어요", variant: "destructive" });
        setShowCodePanel(true);
        return;
      }
      qc.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId, "chat-history"] });
      setRemaining(data.remaining ?? 0);
      setIsUnlimited(data.isUnlimited ?? false);
    },
    onError: async (err: any) => {
      // 429 (한도 초과) 처리
      const msg = err?.message || "오류가 발생했습니다";
      toast({ title: msg, variant: "destructive" });
      if (msg.includes("무료")) setShowCodePanel(true);
    },
  });

  // 스크롤 하단
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, chatMutation.isPending]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || chatMutation.isPending) return;
    setInput("");
    chatMutation.mutate(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 시설 코드 검증
  const verifyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setVerifying(true);
    try {
      const data = await apiRequest("GET", `/api/facility-codes/validate?code=${code}`);
      if (data.valid) {
        setVerifiedFacilityCode(code);
        setIsUnlimited(true);
        setShowCodePanel(false);
        toast({ title: "✅ 시설 코드 확인 완료! 무제한으로 이용할 수 있습니다." });
      } else {
        toast({ title: "유효하지 않은 코드입니다", variant: "destructive" });
      }
    } catch {
      toast({ title: "코드 확인 중 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const ISSUE_SUGGESTIONS: Record<string, string[]> = {
    conflict: [
      "이 갈등 상황을 NCS 문제해결능력으로 어떻게 표현하면 좋을까요?",
      "STAR 기법으로 이 에피소드를 정리해줘",
      "취업 자기소개서에 어떻게 쓸 수 있을까요?",
    ],
    facility: [
      "시설 안전 대응을 NCS 역량으로 어떻게 표현할까요?",
      "이 상황에서 내가 보여준 역량은 뭔가요?",
      "보고서에 쓸 수 있게 요약해줘",
    ],
    counseling: [
      "이 상담 경험을 의사소통능력으로 정리하는 방법은?",
      "청소년 복지 관점에서 내 역할을 설명해줘",
      "공모전 사례 서술로 발전시켜줘",
    ],
    routine: [
      "오늘 루틴 업무를 직업윤리 역량으로 표현해줘",
      "꾸준한 봉사 활동의 의미를 포트폴리오에 어떻게 담을까요?",
    ],
  };
  const suggestions = ISSUE_SUGGESTIONS[lastIssue] || [
    "오늘 봉사 경험에서 어떤 역량을 키울 수 있었나요?",
    "봉사 기록을 자기소개서에 어떻게 활용할까요?",
    "NCS 역량 증빙 자료 작성 방법을 알려주세요",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-lg bg-white/20">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <h1 className="font-bold text-lg">AI 코칭</h1>
          </div>
          <div className="ml-auto">
            {isUnlimited ? (
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">무제한 ✓</span>
            ) : (
              <button
                onClick={() => setShowCodePanel(v => !v)}
                className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"
                data-testid="button-show-code"
              >
                <KeyRound size={12} />
                {remaining}회 남음
              </button>
            )}
          </div>
        </div>
        <p className="text-xs opacity-70 ml-10">봉사 경험 → NCS 역량 · 포트폴리오 조언</p>
      </div>

      {/* 시설 코드 패널 */}
      {showCodePanel && (
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
            <Lock size={14} /> 시설 코드로 무제한 이용
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            담당직원에게 시설 코드를 받아 입력하면 무제한으로 이용할 수 있습니다
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="시설 코드 입력 (예: SHIMTA)"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              className="flex-1 text-sm font-mono tracking-widest"
              data-testid="input-facility-code"
            />
            <Button
              size="sm"
              onClick={verifyCode}
              disabled={verifying || !codeInput.trim()}
              data-testid="button-verify-code"
            >
              {verifying ? "확인 중..." : "확인"}
            </Button>
          </div>
          {!isUnlimited && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              무료: 하루 {FREE_LIMIT}회 · 코드 입력 시 무제한
            </p>
          )}
        </div>
      )}

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* 환영 메시지 */}
        {history.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={32} className="text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">AI 코칭 전문가</p>
            <p className="text-sm text-muted-foreground mb-4">
              봉사 경험을 NCS 역량과 포트폴리오로<br />발전시키는 방법을 함께 찾아드릴게요
            </p>

            {/* 추천 질문 */}
            <div className="space-y-2 text-left">
              <p className="text-xs text-muted-foreground font-medium px-1">💡 추천 질문</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="w-full text-left text-sm p-3 rounded-xl bg-accent hover:bg-primary/10 transition-colors border border-border"
                  data-testid={`suggestion-${i}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {history.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            data-testid={`chat-msg-${msg.id}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"
            }`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} className="text-primary" />}
            </div>
            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border border-border rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* 로딩 */}
        {chatMutation.isPending && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-background">
        {/* 빠른 질문 (이전 대화가 있을 때) */}
        {history.length > 0 && history.length < 4 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
            {suggestions.slice(0, 2).map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-accent border border-border whitespace-nowrap flex-shrink-0"
              >
                {s.slice(0, 20)}...
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="봉사 경험에 대해 무엇이든 물어보세요..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none"
            data-testid="input-chat-message"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            size="icon"
            className="h-11 w-11 flex-shrink-0"
            data-testid="button-send-chat"
          >
            <Send size={18} />
          </Button>
        </div>
        {!isUnlimited && (
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            오늘 {remaining}회 무료 · 시설 코드로 무제한
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
