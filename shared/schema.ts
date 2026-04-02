import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 봉사자 프로필 테이블
export const volunteers = sqliteTable("volunteers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),           // ★ 추가: 봉사자 실명
  pin: text("pin").notNull(),             // ★ 추가: 4자리 비밀번호 (PIN)
  university: text("university").notNull(),
  major: text("major").notNull(),
  grade: text("grade").notNull().default(""),
  branch: text("branch").notNull(),
  startDate: text("start_date").notNull(),
  // 서약서 완료 여부
  pledgeSigned: integer("pledge_signed").notNull().default(0),
  pledgeSignedAt: text("pledge_signed_at").notNull().default(""),
  pledgeSignatureData: text("pledge_signature_data").notNull().default(""), // base64 canvas
  // 오리엔테이션 완료 여부
  orientationDone: integer("orientation_done").notNull().default(0),
  orientationDoneAt: text("orientation_done_at").notNull().default(""),
});

export const insertVolunteerSchema = createInsertSchema(volunteers).omit({ id: true });
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteers.$inferSelect;

// 봉사 활동 기록 테이블
export const records = sqliteTable("records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  volunteerId: integer("volunteer_id").notNull(),
  date: text("date").notNull(),
  affiliation: text("affiliation").notNull(),
  branch: text("branch").notNull(),
  routineChecks: text("routine_checks").notNull(),
  youthCount: integer("youth_count").notNull().default(0),
  coreIssue: text("core_issue").notNull(),
  situationAndAction: text("situation_and_action").notNull().default(""),
  managerApproved: integer("manager_approved").notNull().default(0),
  managerName: text("manager_name").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const insertRecordSchema = createInsertSchema(records).omit({ id: true, createdAt: true });
export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type Record = typeof records.$inferSelect;

// 오리엔테이션 설문 응답 테이블
export const surveyResponses = sqliteTable("survey_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  volunteerId: integer("volunteer_id").notNull(),
  helpfulRating: integer("helpful_rating").notNull(), // 1~5점
  helpfulSlide1: integer("helpful_slide1").notNull().default(0), // 핵심수칙①
  helpfulSlide2: integer("helpful_slide2").notNull().default(0), // 핵심수칙②
  helpfulSlide3: integer("helpful_slide3").notNull().default(0), // 역할과 보고
  helpfulSlide4: integer("helpful_slide4").notNull().default(0), // 혜택
  helpfulSlide5: integer("helpful_slide5").notNull().default(0), // Q&A
  question: text("question").notNull().default(""),             // 궁금한 점
  createdAt: text("created_at").notNull(),
});

export const insertSurveySchema = createInsertSchema(surveyResponses).omit({ id: true, createdAt: true });
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// 루틴 업무 옵션
export const ROUTINE_OPTIONS = [
  "상시이용시설(공간,콘텐츠) 관리",
  "이용자/이용대장 관리",
  "환경개선 및 안전점검",
] as const;

// 핵심 이슈 옵션
export const CORE_ISSUE_OPTIONS = [
  { value: "conflict",   label: "청소년 간 갈등 발생",      emoji: "⚡" },
  { value: "facility",   label: "시설물 오류/안전 문제",     emoji: "🔧" },
  { value: "counseling", label: "청소년의 진로/고민 상담",   emoji: "💬" },
  { value: "routine",    label: "특별한 이슈 없음(루틴)",    emoji: "✅" },
] as const;

// 지점 옵션 (서약서용 — 5호점/7호점만)
export const PLEDGE_BRANCH_OPTIONS = [
  { value: "5호점(금촌)", label: "5호점 — 금촌" },
  { value: "7호점(운정)", label: "7호점 — 운정" },
] as const;

// 기록 입력용 지점 옵션
export const BRANCH_OPTIONS = [
  "쉼표 5호점(금촌)",
  "쉼표 7호점(운정)",
] as const;

// 시설 활성화 코드 테이블
export const facilityCodes = sqliteTable("facility_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),          // 발급된 코드 (6자리 대문자)
  facilityName: text("facility_name").notNull().default(""),  // 시설명
  isActive: integer("is_active").notNull().default(1),       // 0=비활성 1=활성
  createdAt: text("created_at").notNull(),
});
export type FacilityCode = typeof facilityCodes.$inferSelect;

// AI 채팅 기록 테이블 (사용량 실적 추적)
export const aiChats = sqliteTable("ai_chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  volunteerId: integer("volunteer_id").notNull(),
  role: text("role").notNull(),          // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});
export type AiChat = typeof aiChats.$inferSelect;

// 오리엔테이션 슬라이드 메타데이터
export const ORIENTATION_SLIDES = [
  {
    id: 1,
    title: "환영합니다",
    subtitle: "청소년자유공간 쉼표 주말 대학생 봉사자 오리엔테이션",
    icon: "🏫",
    color: "#1a7a4a",
  },
  {
    id: 2,
    title: "환영합니다: 청소년자유공간 쉼표",
    subtitle: "기관 소개 및 시설 안내",
    icon: "👋",
    color: "#1a7a4a",
  },
  {
    id: 3,
    title: "핵심 수칙 ①",
    subtitle: "청소년 응대 및 전문적 경계",
    icon: "🤝",
    color: "#2563eb",
  },
  {
    id: 4,
    title: "핵심 수칙 ②",
    subtitle: "시설물 안전 및 위기 대처",
    icon: "🔧",
    color: "#dc2626",
  },
  {
    id: 5,
    title: "핵심 수칙 ③",
    subtitle: "역할과 보고 체계",
    icon: "📋",
    color: "#7c3aed",
  },
  {
    id: 6,
    title: "여러분을 위한 특별한 혜택",
    subtitle: "실포 플랫폼으로 이루는 특별 활용",
    icon: "🎁",
    color: "#d97706",
  },
  {
    id: 7,
    title: "Q&A 및 행동 규범 서약",
    subtitle: "마지막 안내 및 서약 준비",
    icon: "✍️",
    color: "#1a7a4a",
  },
] as const;