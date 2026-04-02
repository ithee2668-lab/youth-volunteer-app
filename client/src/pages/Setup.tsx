import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { setCurrentVolunteerId } from "@/lib/volunteer";
import type { Volunteer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ChevronRight, Lock } from "lucide-react";

const GRADE_OPTIONS = ["1학년", "2학년", "3학년", "4학년"];

export default function SetupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [myProfileId, setMyProfileId] = useState(() => localStorage.getItem("myProfileId"));
  const [unlockTarget, setUnlockTarget] = useState<Volunteer | null>(null);
  const [pinAttempt, setPinAttempt] = useState("");

  const [form, setForm] = useState({
    name: "",
    pin: "",
    university: "",
    major: "",
    grade: "",
    branch: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  const { data: volunteers } = useQuery<Volunteer[]>({
    queryKey: ["/api/volunteers"],
  });

  const displayVolunteers = myProfileId
    ? volunteers?.filter((v) => v.id.toString() === myProfileId)
    : volunteers;

  // 🛠️ 거짓말 알림 교정: 안전한 JSON 파싱 적용
  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/volunteers", data),
    onSuccess: async (res: any) => {
      try {
        const v = res.json && typeof res.json === 'function' ? await res.json() : res;
        setCurrentVolunteerId(v.id);
        localStorage.setItem("myProfileId", v.id.toString());
        setMyProfileId(v.id.toString());
        queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
        toast({ title: `${v.name}님 환영합니다 ✅` });
        navigate("/");
      } catch (e) {
        console.error("응답 처리 에러:", e);
      }
    },
    onError: (err) => {
      console.error(err);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    },
  });

  const handleExistingSelect = (v: Volunteer) => {
    setUnlockTarget(v);
    setPinAttempt("");
  };

  const handlePinVerify = () => {
    if (unlockTarget && pinAttempt === unlockTarget.pin) {
      setCurrentVolunteerId(unlockTarget.id);
      localStorage.setItem("myProfileId", unlockTarget.id.toString());
      setMyProfileId(unlockTarget.id.toString());
      toast({ title: "인증 완료 ✅" });
      navigate("/");
    } else {
      toast({ title: "비밀번호가 일치하지 않습니다 ❌", variant: "destructive" });
      setPinAttempt("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.pin.length !== 4 || !form.university || !form.major || !form.grade || !form.branch) {
      toast({ title: "모든 항목을 올바르게 입력해주세요", description: "비밀번호는 4자리 숫자여야 합니다.", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-background pb-8 relative">
      
      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{unlockTarget.name} 님</h3>
                <p className="text-xs text-muted-foreground">비밀번호 4자리를 입력하세요</p>
              </div>
            </div>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="****"
              value={pinAttempt}
              onChange={(e) => setPinAttempt(e.target.value.replace(/[^0-9]/g, ""))}
              className="text-center text-3xl tracking-[0.5em] h-16 font-bold bg-muted/50 border-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setUnlockTarget(null)}>취소</Button>
              <Button className="flex-1 h-12" onClick={handlePinVerify} disabled={pinAttempt.length !== 4}>확인</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
            <rect width="36" height="36" rx="10" fill="white" fillOpacity="0.2"/>
            <path d="M18 8 C12 8 8 12 8 18 C8 24 12 28 18 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="18" cy="28" r="2.5" fill="white"/>
            <path d="M22 14 L26 18 L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <h1 className="text-xl font-bold">청소년자유공간 대학생 자원봉사자 봉사 기록 앱</h1>
            <p className="text-sm opacity-80">청소년자유공간 봉사 기록 앱</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 animate-in">
        {displayVolunteers && displayVolunteers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">기존 프로필로 계속하기</h2>
              {myProfileId && (
                <button
                  onClick={() => {
                    localStorage.removeItem("myProfileId");
                    setMyProfileId(null);
                  }}
                  className="text-xs text-primary underline hover:opacity-80 transition-opacity"
                >
                  초기화 (다른 사람 찾기)
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {displayVolunteers.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleExistingSelect(v)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <GraduationCap size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-[15px]">{v.name || "이름없음"} <span className="font-normal text-xs text-muted-foreground ml-1">{v.university}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{v.major} {v.grade} · {v.branch}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
            
            {!myProfileId && (
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">또는 새 프로필 만들기</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
          </div>
        )}

        {!myProfileId && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Lock size={18} className="text-primary" /> 프로필 및 보안 설정
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">이름 (실명) *</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">4자리 비밀번호 *</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="****"
                  value={form.pin}
                  onChange={e => setForm({ ...form, pin: e.target.value.replace(/[^0-9]/g, "") })}
                  className="tracking-widest font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="university">학교 *</Label>
              <Input
                id="university"
                placeholder="서영대학교"
                value={form.university}
                onChange={e => setForm({ ...form, university: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">학과 *</Label>
              <Input
                id="major"
                placeholder="사회복지행정학과"
                value={form.major}
                onChange={e => setForm({ ...form, major: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>학년 *</Label>
              <div className="grid grid-cols-4 gap-2">
                {GRADE_OPTIONS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, grade: g })}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.grade === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>봉사 지점 *</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {(["쉼표 5호점(금촌)", "쉼표 7호점(운정)"] as const).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setForm({ ...form, branch: b })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.branch === b ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <p className="font-bold text-sm">{b.includes("5") ? "5호점" : "7호점"}</p>
                    <p className={`text-xs mt-0.5 ${form.branch === b ? "opacity-80" : "text-muted-foreground"}`}>{b.includes("금촌") ? "금촌" : "운정"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">봉사 시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold mt-4 shadow-md"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "저장 중..." : "프로필 생성 및 시작하기 →"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}