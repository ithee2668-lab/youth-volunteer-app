import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentVolunteerId } from "@/lib/volunteer";
import { PLEDGE_BRANCH_OPTIONS } from "@shared/schema";
import type { Volunteer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Pen, RotateCcw, Home } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const PLEDGE_ITEMS = [
  {
    num: 1,
    label: "전문적 경계 유지",
    text: "청소년을 존중하는 태도로 대하며, 시설 밖에서의 사적인 만남이나 개인 연락처(전화번호, 카카오톡, SNS 등) 교환을 절대 하지 않겠습니다.",
  },
  {
    num: 2,
    label: "비밀 유지",
    text: "활동 중 알게 된 청소년의 개인정보, 가정환경, 상담 내용 등 모든 직무상 비밀을 활동 기간은 물론 종료 후에도 외부에 절대 누설하지 않겠습니다.",
  },
  {
    num: 3,
    label: "안전 및 보고 의무",
    text: "시설 내 안전사고, 청소년 간의 폭력, 아동학대 의심 징후 등을 발견할 경우 즉각 기관의 담당 직원에게 보고하며, 임의로 판단하여 개입하지 않겠습니다.",
  },
  {
    num: 4,
    label: "성실의 의무",
    text: "부여된 업무(시설 관리, 행정 보조 등)를 성실히 수행하며, 활동 종료 전 지정된 플랫폼에 활동 일지를 사실에 입각하여 정확하게 기록하겠습니다.",
  },
  {
    num: 5,
    label: "품위 유지",
    text: "예비 전문가로서의 품위를 유지하며, 특정 종교나 정치적 신념을 청소년에게 강요하지 않겠습니다.",
  },
];

export default function PledgePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const volunteerId = getCurrentVolunteerId();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [branch, setBranch] = useState("");
  const [completed, setCompleted] = useState(false);

  const { data: volunteer } = useQuery<Volunteer>({
    queryKey: ["/api/volunteers", volunteerId],
    enabled: !!volunteerId,
    onSuccess: (v) => {
      if (v.pledgeSigned) setCompleted(true);
      if (v.branch && !branch) setBranch(v.branch);
    },
  });

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a2540";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    setLastPos(pos);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
    setHasSignature(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveMutation = useMutation({
    mutationFn: (signatureData: string) =>
      apiRequest("PATCH", `/api/volunteers/${volunteerId}`, {
        pledgeSigned: 1,
        pledgeSignedAt: new Date().toISOString(),
        pledgeSignatureData: signatureData,
        branch: branch || volunteer?.branch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers", volunteerId] });
      setCompleted(true);
      toast({ title: "서약서가 제출되었습니다 ✅" });
    },
    onError: () => {
      toast({ title: "제출 실패", description: "다시 시도해주세요", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!branch) {
      toast({ title: "활동 지점을 선택해주세요", variant: "destructive" });
      return;
    }
    if (!hasSignature) {
      toast({ title: "서명을 해주세요", variant: "destructive" });
      return;
    }
    const signatureData = canvasRef.current?.toDataURL("image/png") ?? "";
    saveMutation.mutate(signatureData);
  };

  // 완료 화면
  if (completed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <CheckCircle size={40} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">서약 완료!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          행동 규범 서약서가 제출되었습니다.<br />
          이제 봉사 활동을 시작할 수 있습니다.
        </p>
        <div className="w-full p-4 rounded-2xl bg-card border border-border mb-4 text-left">
          <p className="text-xs text-muted-foreground mb-3">서약 정보</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">소속</span>
              <span className="font-medium">{volunteer?.university} {volunteer?.major}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">학년</span>
              <span className="font-medium">{(volunteer as any)?.grade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">활동 지점</span>
              <span className="font-medium">쉼표 {branch || volunteer?.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">서약일</span>
              <span className="font-medium">{format(new Date(), "yyyy년 M월 d일", { locale: ko })}</span>
            </div>
          </div>
        </div>
        {volunteer?.pledgeSignatureData && (
          <div className="w-full mb-5">
            <p className="text-xs text-muted-foreground mb-2 text-left">전자서명</p>
            <div className="border border-border rounded-xl overflow-hidden bg-white">
              <img src={volunteer.pledgeSignatureData} alt="서명" className="w-full h-20 object-contain" />
            </div>
          </div>
        )}
        <Button
          className="w-full h-12 font-semibold gap-2"
          onClick={() => navigate("/")}
          data-testid="button-go-home"
        >
          <Home size={18} /> 봉사 활동 시작하기
        </Button>
      </div>
    );
  }

  const today = format(new Date(), "yyyy년  M월     일", { locale: ko });

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* 헤더 */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Pen size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg">자원봉사자 행동 규범 서약서</h1>
            <p className="text-xs opacity-75 mt-0.5">파주시청소년재단 · 운정청소년센터</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 animate-in">
        {/* 서약자 정보 — 학교/학과/학년만 표시 */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <h2 className="font-bold text-base">서약자 정보</h2>

          {/* 소속 정보 — 읽기 전용 (프로필에서 가져옴) */}
          <div className="p-3 rounded-xl bg-muted space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">학교</span>
              <span className="font-medium">{volunteer?.university ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">학과</span>
              <span className="font-medium">{volunteer?.major ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">학년</span>
              <span className="font-medium">{(volunteer as any)?.grade ?? "—"}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            정보가 잘못된 경우 프로필 설정에서 수정해주세요
          </p>

          {/* 활동 지점 선택 */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">활동 지점 *</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {PLEDGE_BRANCH_OPTIONS.map(opt => {
                const selected = branch === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBranch(opt.value)}
                    data-testid={`branch-${opt.value}`}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <p className="font-bold text-sm">{opt.value.split("(")[0]}</p>
                    <p className={`text-xs mt-0.5 ${selected ? "opacity-80" : "text-muted-foreground"}`}>
                      {opt.value.includes("금촌") ? "금촌" : "운정"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 서약 본문 */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            본인은 파주시청소년재단 청소년자유공간 쉼표의 자원봉사자로서 활동함에 있어,
            청소년의 안전과 권리를 보호하고 기관의 규정을 준수하기 위해 다음 사항을 엄격히 지킬 것을 서약합니다.
          </p>
          <div className="space-y-3">
            {PLEDGE_ITEMS.map(item => (
              <div key={item.num} className="flex gap-3 p-3 rounded-xl bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.num}
                </div>
                <div>
                  <p className="text-xs font-bold text-primary mb-1">({item.label})</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-4">
            본인은 위 사항을 충분히 숙지하였으며, 이를 위반하여 발생하는 모든 책임은 본인에게 있음을 인정하고 이에 서명합니다.
          </p>
        </div>

        {/* 날짜 */}
        <div className="p-4 rounded-xl bg-muted text-center">
          <p className="text-sm font-medium">{today}</p>
        </div>

        {/* 전자서명 */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-sm flex items-center gap-2">
                <Pen size={15} className="text-primary" /> 전자서명
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">아래 영역에 직접 서명해주세요</p>
            </div>
            <button
              onClick={clearSignature}
              data-testid="button-clear-signature"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <RotateCcw size={13} /> 다시쓰기
            </button>
          </div>

          <div className={`relative rounded-xl border-2 overflow-hidden bg-white ${
            hasSignature ? "border-primary" : "border-dashed border-border"
          }`}>
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground/50 text-sm">여기에 서명하세요</p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={600}
              height={160}
              className="w-full touch-none block"
              data-testid="canvas-signature"
              style={{ cursor: "crosshair" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-xs text-muted-foreground">서약자</p>
            <p className="text-sm font-medium text-muted-foreground">(서명 또는 인)</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">운정청소년센터 기관장 귀하</p>
        </div>

        {/* 제출 버튼 */}
        <Button
          className="w-full h-12 font-semibold gap-2 text-base"
          data-testid="button-submit-pledge"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
        >
          <CheckCircle size={20} />
          {saveMutation.isPending ? "제출 중..." : "서약서 제출"}
        </Button>
        <p className="text-xs text-muted-foreground text-center pb-2">
          제출하면 서약 내용을 디지털로 저장합니다
        </p>
      </div>
    </div>
  );
}
