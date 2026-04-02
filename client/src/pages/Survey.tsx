import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { ORIENTATION_SLIDES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Star, MessageSquare, ArrowRight } from "lucide-react";

const SLIDE_LABELS = [
  "오리엔테이션 전반",
  "기관 소개 (시설 안내)",
  "핵심수칙 ① (청소년 응대)",
  "핵심수칙 ② (시설 안전)",
  "핵심수칙 ③ (역할·보고)",
];

export default function SurveyPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const volunteerId = getCurrentVolunteerId();

  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [slideRatings, setSlideRatings] = useState<boolean[]>([false, false, false, false, false]);
  const [question, setQuestion] = useState("");

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/surveys", {
        volunteerId,
        helpfulRating: overallRating,
        helpfulSlide1: slideRatings[0] ? 1 : 0,
        helpfulSlide2: slideRatings[1] ? 1 : 0,
        helpfulSlide3: slideRatings[2] ? 1 : 0,
        helpfulSlide4: slideRatings[3] ? 1 : 0,
        helpfulSlide5: slideRatings[4] ? 1 : 0,
        question,
      }),
    onSuccess: () => {
      toast({ title: "설문이 제출되었습니다 감사합니다 ✅" });
      navigate("/pledge");
    },
    onError: () => {
      toast({ title: "제출 실패", description: "다시 시도해주세요", variant: "destructive" });
    },
  });

  const toggleSlide = (i: number) => {
    setSlideRatings(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const canSubmit = overallRating > 0;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-8">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-4">
          📝
        </div>
        <h1 className="text-xl font-bold">오리엔테이션 설문</h1>
        <p className="text-sm opacity-75 mt-1">
          솔직한 답변이 더 나은 오리엔테이션을 만듭니다
        </p>
      </div>

      <div className="px-5 mt-6 space-y-6 animate-in">
        {/* Q1: 전반적인 도움 정도 */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">Q1</div>
            <div>
              <p className="font-bold">오리엔테이션 자료가 봉사활동에 얼마나 도움이 되었나요?</p>
              <p className="text-xs text-muted-foreground mt-1">별점을 선택해주세요</p>
            </div>
          </div>

          {/* 별점 */}
          <div className="flex justify-center gap-3 py-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                data-testid={`star-${star}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setOverallRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    star <= (hoverRating || overallRating)
                      ? "fill-amber-400 stroke-amber-400"
                      : "stroke-border fill-transparent"
                  }`}
                />
              </button>
            ))}
          </div>
          {overallRating > 0 && (
            <p className="text-center text-sm font-medium mt-2 text-primary">
              {["", "별로 도움이 안됐어요", "조금 도움이 됐어요", "보통이에요", "도움이 됐어요", "매우 도움이 됐어요"][overallRating]}
            </p>
          )}
        </div>

        {/* Q2: 특히 도움이 된 슬라이드 */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">Q2</div>
            <div>
              <p className="font-bold">특히 도움이 된 내용은 무엇인가요?</p>
              <p className="text-xs text-muted-foreground mt-1">해당하는 것을 모두 선택하세요</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {SLIDE_LABELS.map((label, i) => {
              const checked = slideRatings[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleSlide(i)}
                  data-testid={`slide-check-${i}`}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    checked ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    checked ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}>
                    {checked && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-sm font-medium ${checked ? "text-primary" : ""}`}>
                    {["🏫", "👋", "🤝", "🔧", "📋"][i]} {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Q3: 궁금한 점 */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">Q3</div>
            <div>
              <p className="font-bold">궁금한 점이나 건의사항이 있으신가요?</p>
              <p className="text-xs text-muted-foreground mt-1">선택 항목 · 담당자가 직접 확인합니다</p>
            </div>
          </div>
          <Textarea
            placeholder="예) 시설물 점검 방법이 더 구체적으로 설명되었으면 좋겠어요. 청소년과 갈등 상황 시 대처 사례가 더 있으면 좋겠습니다."
            className="min-h-[120px] text-sm resize-none"
            data-testid="textarea-question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare size={12} />
              <span>담당자에게 전달됩니다</span>
            </div>
            <span className="text-xs text-muted-foreground">{question.length}/500</span>
          </div>
        </div>

        {/* 건너뛰기 + 제출 */}
        <div className="space-y-2">
          <Button
            className="w-full h-12 font-semibold gap-2"
            data-testid="button-submit-survey"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
          >
            <CheckCircle size={18} />
            {submitMutation.isPending ? "제출 중..." : "설문 제출 → 서약서 작성"}
          </Button>
          <button
            onClick={() => navigate("/pledge")}
            className="w-full text-sm text-muted-foreground py-2 text-center hover:text-foreground transition-colors"
            data-testid="button-skip-survey"
          >
            건너뛰고 서약서 바로 작성 <ArrowRight size={13} className="inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
