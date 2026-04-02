import type { Express } from "express";
import { type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertVolunteerSchema, insertRecordSchema, insertSurveySchema } from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ---- 봉사자 프로필 ----
  app.get("/api/volunteers", (_req, res) => {
    // 🔐 열쇠구멍 개방: 브라우저가 비밀번호를 대조할 수 있도록 PIN을 포함하여 전송
    res.json(storage.getAllVolunteers());
  });

  app.get("/api/volunteers/:id", (req, res) => {
    const v = storage.getVolunteer(Number(req.params.id));
    if (!v) return res.status(404).json({ message: "봉사자를 찾을 수 없습니다" });
    res.json(v);
  });

  app.post("/api/volunteers", (req, res) => {
    const result = insertVolunteerSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const v = storage.createVolunteer(result.data);
    res.status(201).json(v);
  });

  app.patch("/api/volunteers/:id", (req, res) => {
    const v = storage.updateVolunteer(Number(req.params.id), req.body);
    if (!v) return res.status(404).json({ message: "봉사자를 찾을 수 없습니다" });
    res.json(v);
  });

  // ---- 봉사 기록 ----
  app.get("/api/volunteers/:volunteerId/records", (req, res) => {
    res.json(storage.getRecordsByVolunteer(Number(req.params.volunteerId)));
  });
  app.get("/api/records/:id", (req, res) => {
    const r = storage.getRecord(Number(req.params.id));
    if (!r) return res.status(404).json({ message: "기록을 찾을 수 없습니다" });
    res.json(r);
  });
  app.post("/api/records", (req, res) => {
    const result = insertRecordSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.message });
    res.status(201).json(storage.createRecord(result.data));
  });
  app.patch("/api/records/:id", (req, res) => {
    const r = storage.updateRecord(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ message: "기록을 찾을 수 없습니다" });
    res.json(r);
  });
  app.delete("/api/records/:id", (req, res) => {
    storage.deleteRecord(Number(req.params.id));
    res.json({ success: true });
  });

  // ---- 통계 ----
  app.get("/api/volunteers/:volunteerId/stats", (req, res) => {
    res.json(storage.getStats(Number(req.params.volunteerId)));
  });

  // ---- PDF 생성 (서버사이드 한글 지원) ----
  app.get("/api/volunteers/:volunteerId/pdf", async (req, res) => {
    try {
      const volunteerId = Number(req.params.volunteerId);
      const volunteer = storage.getVolunteer(volunteerId);
      if (!volunteer) return res.status(404).json({ message: "봉사자를 찾을 수 없습니다" });

      const records = storage.getRecordsByVolunteer(volunteerId);
      const stats = storage.getStats(volunteerId);
      const approvedCount = records.filter(r => r.managerApproved).length;
      const approvalRate = stats.totalSessions
        ? Math.round((approvedCount / stats.totalSessions) * 100) : 0;

      const PDFDocument = (await import("pdfkit")).default;
      const fontPath = path.join(process.cwd(), "server", "fonts", "NotoSansKR.ttf");

      const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));

      const PW = 595.28; // A4 width in points
      const GREEN = "#1a7a4a";
      const NAVY = "#1a2540";
      const GRAY = "#666666";
      const LIGHT = "#f5f8f5";
      const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");

      const KO = (size: number) => doc.font(fontPath).fontSize(size);

      // ── 표지 헤더 ──────────────────────────────────────────────
      doc.rect(0, 0, PW, 190).fill(GREEN);
      KO(11).fillColor("#ffffff").text("청소년자유공간 봉사활동 포트폴리오", 48, 38);
      KO(26).fillColor("#ffffff").text("Volunteer Portfolio", 48, 60);
      KO(16).fillColor("#ffffff").text(`${volunteer.name} 봉사자`, 48, 95); 
      KO(12).fillColor("#ffffffcc").text(`${volunteer.university}  |  ${volunteer.major}`, 48, 120);
      KO(10).fillColor("#ffffff99").text(`${(volunteer as any).grade ?? ""}  |  ${volunteer.branch}`, 48, 140);
      KO(10).fillColor("#ffffff80").text(`작성일: ${today}`, 48, 160);

      let y = 220;
      const sectionTitle = (title: string) => {
        if (y > 720) { doc.addPage(); y = 40; }
        KO(14).fillColor(NAVY).text(title, 48, y, { width: PW - 96 });
        doc.moveTo(48, y + 20).lineTo(PW - 48, y + 20).stroke(GREEN);
        y += 32;
      };
      const kpiBox = (x: number, cy: number, label: string, value: string) => {
        doc.rect(x, cy, 220, 52).fill(LIGHT);
        KO(9).fillColor(GRAY).text(label, x + 12, cy + 10, { width: 200 });
        KO(18).fillColor(NAVY).text(value, x + 12, cy + 24, { width: 200 });
      };

      // ── 섹션 1: 봉사 요약 ──────────────────────────────────────
      sectionTitle("1. 봉사 활동 요약");
      kpiBox(48, y, "총 봉사 횟수", `${stats.totalSessions}회`);
      kpiBox(280, y, "응대 청소년 수", `${stats.totalYouth}명`);
      y += 64;
      kpiBox(48, y, "관리자 인증률", `${approvalRate}%`);
      kpiBox(280, y, "봉사 기간", `${volunteer.startDate} ~`);
      y += 72;

      // ── 섹션 2: NCS 역량 ───────────────────────────────────────
      sectionTitle("2. NCS 직무역량 증빙");
      const skills = [
        { name: "문제해결능력", count: `${(stats.issueBreakdown?.conflict ?? 0) + (stats.issueBreakdown?.facility ?? 0)}건`, desc: "청소년 간 갈등 중재, 시설 안전 문제 보고 및 처리" },
        { name: "의사소통능력", count: `${stats.issueBreakdown?.counseling ?? 0}건`, desc: "청소년의 진로·고민 경청 및 정보 안내, 관리자 협업" },
        { name: "직업윤리", count: `${stats.totalSessions}회`, desc: "출입대장 확인, 환경정비, 시설 안전 순찰 정기 수행" },
        { name: "자원관리능력", count: `${stats.routineBreakdown?.["환경정비 및 안전순찰"] ?? 0}회`, desc: "청소년 공간 환경 정비 및 안전 자원 관리" },
      ];
      for (const s of skills) {
        if (y > 720) { doc.addPage(); y = 40; }
        doc.rect(48, y, 4, 44).fill(GREEN);
        doc.rect(52, y, PW - 100, 44).fill(LIGHT);
        KO(12).fillColor(NAVY).text(s.name, 68, y + 8, { width: 120 });
        KO(11).fillColor(GREEN).text(s.count, 200, y + 8, { width: 80 });
        KO(10).fillColor(GRAY).text(s.desc, 68, y + 26, { width: PW - 160 });
        y += 52;
      }
      y += 8;

      // ── 섹션 3: 현장 에피소드 ──────────────────────────────────
      const withText = records.filter(r => r.situationAndAction && r.situationAndAction.length > 10).slice(0, 5);
      if (withText.length > 0) {
        sectionTitle("3. 현장 에피소드 (STAR 기법)");
        const ISSUE_LABEL: Record<string, string> = { conflict: "갈등·분쟁", facility: "시설·안전", counseling: "상담·지원", routine: "일상·운영" };
        for (let i = 0; i < withText.length; i++) {
          const r = withText[i];
          if (y > 680) { doc.addPage(); y = 40; }
          const textH = Math.min(doc.heightOfString(r.situationAndAction, { width: PW - 140 }), 60) + 60;
          doc.rect(48, y, PW - 96, textH).fill(LIGHT);
          doc.rect(48, y, 4, textH).fill(GREEN);
          KO(11).fillColor(NAVY).text(`${i + 1}. ${r.date}  |  ${r.branch}`, 60, y + 10, { width: PW - 120 });
          KO(10).fillColor(GREEN).text(`[${ISSUE_LABEL[r.coreIssue] ?? r.coreIssue}]  청소년 ${r.youthCount}명`, 60, y + 26, { width: PW - 120 });
          KO(10).fillColor(GRAY).text(r.situationAndAction, 60, y + 42, { width: PW - 120, ellipsis: true });
          if (r.managerApproved) KO(9).fillColor(GREEN).text(`✓ 담당직원 인증${r.managerName ? ` (${r.managerName})` : ""}`, PW - 180, y + textH - 18, { width: 140, align: "right" });
          y += textH + 8;
        }
        y += 8;
      }

      // ── 섹션 4: 전체 활동 이력 ─────────────────────────────────
      const secNum = withText.length > 0 ? "4" : "3";
      sectionTitle(`${secNum}. 전체 활동 이력`);
      const COL = [48, 108, 196, 300, 360, 480];
      const HDR = ["날짜", "지점", "이슈", "청소년", "루틴", "인증"];
      doc.rect(48, y, PW - 96, 22).fill(NAVY);
      HDR.forEach((h, i) => KO(9).fillColor("#ffffff").text(h, COL[i] + 4, y + 7, { width: 60 }));
      y += 22;
      const ISSUE_SHORT: Record<string, string> = { conflict: "갈등", facility: "시설", counseling: "상담", routine: "일상" };
      for (let i = 0; i < Math.min(records.length, 25); i++) {
        if (y > 750) { doc.addPage(); y = 40; }
        const r = records[i];
        let rt: string[] = []; try { rt = JSON.parse(r.routineChecks); } catch {}
        doc.rect(48, y, PW - 96, 18).fill(i % 2 === 0 ? LIGHT : "#ffffff");
        KO(8).fillColor(GRAY);
        doc.text(r.date.slice(5), COL[0] + 4, y + 5, { width: 52 });
        doc.text(r.branch.replace("쉼표 ", "").replace("(금촌)", "").replace("(운정)", ""), COL[1] + 4, y + 5, { width: 80 });
        doc.text(ISSUE_SHORT[r.coreIssue] ?? r.coreIssue, COL[2] + 4, y + 5, { width: 56 });
        KO(8).fillColor(NAVY).text(`${r.youthCount}명`, COL[3] + 4, y + 5, { width: 52 });
        KO(8).fillColor(GRAY).text(`${rt.length}/3`, COL[4] + 4, y + 5, { width: 112 });
        KO(8).fillColor(r.managerApproved ? GREEN : GRAY).text(r.managerApproved ? "✓" : "-", COL[5] + 4, y + 5, { width: 48 });
        y += 18;
      }

      // ── 푸터 ────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        KO(8).fillColor(GRAY).text(
          `${volunteer.name} (${volunteer.university}) | ${today}  |  ${i + 1} / ${range.count}`,
          48, 820, { width: PW - 96, align: "center" }
        );
      }

      doc.end();
      await new Promise<void>((resolve) => doc.on("end", resolve));

      const pdfBuffer = Buffer.concat(chunks);
      const filename = encodeURIComponent(`봉사포트폴리오_${volunteer.name}_${today}.pdf`);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("PDF 생성 오류:", err);
      res.status(500).json({ message: "PDF 생성 중 오류가 발생했습니다: " + err.message });
    }
  });

  // ---- 관리자 인증 및 기타 로직 ----
  const ADMIN_PASSWORD = "admin1234"; 

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "비밀번호가 올바르지 않습니다" });
    }
  });

  app.get("/api/admin/volunteers", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    res.json(storage.getAllVolunteers());
  });

  app.get("/api/admin/records", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    res.json(storage.getAllRecords());
  });

  app.get("/api/admin/surveys", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    res.json(storage.getAllSurveys());
  });

  app.get("/api/facility-codes/validate", (req, res) => {
    const code = String(req.query.code || "").toUpperCase();
    const valid = storage.validateFacilityCode(code);
    res.json({ valid, unlimited: valid });
  });

  app.get("/api/admin/facility-codes", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    res.json(storage.getAllFacilityCodes());
  });

  app.post("/api/admin/facility-codes", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    const { code, facilityName } = req.body;
    if (!code || code.length < 4) return res.status(400).json({ message: "코드는 4자리 이상이어야 합니다" });
    const created = storage.createFacilityCode(code, facilityName || "");
    res.status(201).json(created);
  });

  app.patch("/api/admin/facility-codes/:id/deactivate", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    storage.deactivateFacilityCode(Number(req.params.id));
    res.json({ success: true });
  });

  // ---- AI 코칭 채팅 ----
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  const FREE_DAILY_LIMIT = 10; 

  const callGemini = async (systemPrompt: string, chatMessages: {role: string; content: string}[], maxTokens = 500) => {
    const contents = chatMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
        }),
      }
    );
    if (!response.ok) {
      const err = await response.text();
      throw new Error("Gemini API 오류: " + err);
    }
    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  };

  app.get("/api/volunteers/:volunteerId/chat-history", (req, res) => {
    res.json(storage.getChatHistory(Number(req.params.volunteerId)));
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { volunteerId, message, facilityCode, issueContext } = req.body;
      if (!volunteerId || !message) return res.status(400).json({ message: "필수 필드 누락" });

      const isUnlimited = facilityCode ? storage.validateFacilityCode(facilityCode) : false;
      if (!isUnlimited) {
        const todayCount = storage.getAiUsageCount(Number(volunteerId));
        if (todayCount >= FREE_DAILY_LIMIT) {
          return res.status(429).json({
            message: `오늘 무료 사용량(${FREE_DAILY_LIMIT}회)을 모두 사용했습니다.`,
            limitReached: true,
            remaining: 0,
          });
        }
      }

      if (!GEMINI_API_KEY) return res.status(500).json({ message: "AI 서비스 키가 설정되지 않았습니다" });

      const history = storage.getChatHistory(Number(volunteerId), 10);
      const systemPrompt = `당신은 청소년자유공간 대학생 자원봉사자의 성장을 돕는 AI 코치입니다.
핵심 원칙:
- 절대 먼저 정답이나 완성된 문장을 주지 마세요
- 질문으로 봉사자 스스로 생각을 꺼내도록 유도하세요
- 감정 → 판단 → 행동 → 결과 순서로 깊이 파고드세요
- 봉사자가 쓴 표현을 존중하고, 그 위에 구조를 얹어주세요

대화 흐름:
1단계: 오늘 있었던 일을 본인 말로 먼저 물어보세요
2단계: "그 순간 어떤 생각이 드셨나요?" "왜 그렇게 행동했나요?" 등으로 내면을 탐색하게 하세요
3단계: 봉사자가 충분히 표현하면 "지금 말씀하신 내용이 NCS OO역량이에요"라고 연결해주세요
4단계: 봉사자가 직접 문장을 써보도록 제안하고, 써오면 피드백하세요

절대 하지 말 것:
- 봉사자가 짧게 말했다고 바로 완성문 제시
- "이렇게 쓰면 됩니다" 식의 정답 제공
- 너무 긴 설명

${issueContext ? `오늘 이슈 맥락: ${issueContext}` : ""}
한국어로, 따뜻하고 친근하게, 2~3문장 이내로 짧게 대화하세요.`;

      const chatMessages = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      const aiReply = await callGemini(systemPrompt, chatMessages, 400);

      storage.saveChat(Number(volunteerId), "user", message);
      storage.saveChat(Number(volunteerId), "assistant", aiReply);

      const remaining = isUnlimited ? 999 : FREE_DAILY_LIMIT - storage.getAiUsageCount(Number(volunteerId));
      res.json({ reply: aiReply, remaining, isUnlimited });
    } catch (err: any) {
      console.error("AI 코칭 오류:", err);
      res.status(500).json({ message: "AI 응답 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/chat-inline", async (req, res) => {
    try {
      const { volunteerId, messages, issueContext, issueLabel, currentDraft, facilityCode } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: "messages 필드 필요" });

      const isUnlimited = facilityCode ? storage.validateFacilityCode(facilityCode) : false;
      if (!isUnlimited) {
        const todayCount = storage.getAiUsageCount(Number(volunteerId));
        if (todayCount >= FREE_DAILY_LIMIT) {
          return res.status(429).json({
            message: `오늘 무료 사용량(${FREE_DAILY_LIMIT}회)을 모두 사용했습니다.`,
            limitReached: true,
          });
        }
      }

      if (!GEMINI_API_KEY) return res.status(500).json({ message: "AI 서비스가 설정되지 않았습니다" });

      const systemPrompt = `당신은 청소년자유공간 대학생 자원봉사자가 봉사 기록을 스스로 작성하도록 돕는 코치입니다.
현재 상황:
- 오늘의 핵심 이슈: ${issueLabel || issueContext || "미선택"}
- 봉사자가 작성 중인 내용: ${currentDraft ? `"${currentDraft}"` : "(아직 없음)"}

대화 방식 (반드시 이 순서로):
1. 처음 대화 시작 → 오늘 어떤 일이 있었는지 1가지 질문으로 시작
2. 봉사자가 짧게 답하면 → "그때 어떻게 행동하셨나요?" / "왜 그렇게 하셨나요?" 등 1개 추가 질문
3. 행동과 이유가 나오면 → "그 결과는 어떻게 됐나요?" 질문
4. 상황·행동·결과가 모두 나왔을 때만 → STAR 구조로 정리한 문장 제안

문장 제안 시 출력 형식 (4단계에서만 사용):
📝 **제안 문장:**
(봉사자가 말한 내용 기반의 100~150자 문장)
💡 직접 수정해서 더 본인답게 만들어보세요!

한국어로, 친근하고 따뜻하게, 2~3문장 이내로 짧게.`;

      const aiReply = await callGemini(systemPrompt, messages, 350);

      if (volunteerId) {
        storage.saveChat(Number(volunteerId), "user", messages[messages.length - 1]?.content || "");
        storage.saveChat(Number(volunteerId), "assistant", aiReply);
      }

      const suggestionMatch = aiReply.match(/📝\s*\*{0,2}제안\s*문장[^:]*:\*{0,2}\s*([\s\S]+?)(?:\n\n|💡|$)/);
      const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;

      const remaining = isUnlimited ? 999 : FREE_DAILY_LIMIT - storage.getAiUsageCount(Number(volunteerId));
      res.json({ reply: aiReply, suggestion, remaining, isUnlimited });
    } catch (err: any) {
      console.error("AI 인라인 코칭 오류:", err);
      res.status(500).json({ message: "AI 응답 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/admin/ai-chats", (req, res) => {
    const pw = req.headers["x-admin-password"];
    if (pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "인증 실패" });
    res.json(storage.getAllAiChats());
  });

  app.post("/api/surveys", (req, res) => {
    const result = insertSurveySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.message });
    res.status(201).json(storage.createSurvey(result.data));
  });
  app.get("/api/volunteers/:volunteerId/survey", (req, res) => {
    res.json(storage.getSurveyByVolunteer(Number(req.params.volunteerId)) ?? null);
  });

  return httpServer;
}