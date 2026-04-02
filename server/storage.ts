import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  volunteers, records, surveyResponses, facilityCodes, aiChats,
  type Volunteer, type InsertVolunteer,
  type Record, type InsertRecord,
  type SurveyResponse, type InsertSurvey,
  type FacilityCode, type AiChat,
} from "@shared/schema";

const sqlite = new Database("shimtae.db");
const db = drizzle(sqlite);

// CREATE 테이블
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university TEXT NOT NULL,
    major TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL,
    start_date TEXT NOT NULL,
    pledge_signed INTEGER NOT NULL DEFAULT 0,
    pledge_signed_at TEXT NOT NULL DEFAULT '',
    pledge_signature_data TEXT NOT NULL DEFAULT '',
    orientation_done INTEGER NOT NULL DEFAULT 0,
    orientation_done_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    affiliation TEXT NOT NULL,
    branch TEXT NOT NULL,
    routine_checks TEXT NOT NULL,
    youth_count INTEGER NOT NULL DEFAULT 0,
    core_issue TEXT NOT NULL,
    situation_and_action TEXT NOT NULL DEFAULT '',
    manager_approved INTEGER NOT NULL DEFAULT 0,
    manager_name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_id INTEGER NOT NULL,
    helpful_rating INTEGER NOT NULL,
    helpful_slide1 INTEGER NOT NULL DEFAULT 0,
    helpful_slide2 INTEGER NOT NULL DEFAULT 0,
    helpful_slide3 INTEGER NOT NULL DEFAULT 0,
    helpful_slide4 INTEGER NOT NULL DEFAULT 0,
    helpful_slide5 INTEGER NOT NULL DEFAULT 0,
    question TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS facility_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    facility_name TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 기본 시설 코드가 없으면 자동 생성 (파주시 쉼표)
try {
  const existing = sqlite.prepare("SELECT COUNT(*) as cnt FROM facility_codes").get() as { cnt: number };
  if (existing.cnt === 0) {
    sqlite.exec(`INSERT INTO facility_codes (code, facility_name, is_active, created_at) VALUES ('SHIMTA', '파주시청소년재단 쉼표', 1, '${new Date().toISOString()}')`);
  }
} catch {}

// 마이그레이션 오류 무시 (이미 존재하는 컬럼)
try {
  sqlite.exec(`ALTER TABLE volunteers ADD COLUMN grade TEXT NOT NULL DEFAULT '';`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE volunteers ADD COLUMN pledge_signed INTEGER NOT NULL DEFAULT 0;`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE volunteers ADD COLUMN pledge_signed_at TEXT NOT NULL DEFAULT '';`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE volunteers ADD COLUMN pledge_signature_data TEXT NOT NULL DEFAULT '';`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE volunteers ADD COLUMN orientation_done INTEGER NOT NULL DEFAULT 0;`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE volunteers ADD COLUMN orientation_done_at TEXT NOT NULL DEFAULT '';`);
} catch {}

export interface IStorage {
  getVolunteer(id: number): Volunteer | undefined;
  getAllVolunteers(): Volunteer[];
  createVolunteer(data: InsertVolunteer): Volunteer;
  updateVolunteer(id: number, data: Partial<InsertVolunteer>): Volunteer | undefined;
  getRecord(id: number): Record | undefined;
  getRecordsByVolunteer(volunteerId: number): Record[];
  createRecord(data: InsertRecord): Record;
  updateRecord(id: number, data: Partial<InsertRecord>): Record | undefined;
  deleteRecord(id: number): void;
  getStats(volunteerId: number): {
    totalSessions: number;
    totalYouth: number;
    issueBreakdown: { [key: string]: number };
    routineBreakdown: { [key: string]: number };
    recentRecords: Record[];
  };
  createSurvey(data: InsertSurvey): SurveyResponse;
  getSurveyByVolunteer(volunteerId: number): SurveyResponse | undefined;
  getAllSurveys(): SurveyResponse[];
  getAllRecords(): Record[];
  // 시설 코드
  getAllFacilityCodes(): FacilityCode[];
  createFacilityCode(code: string, facilityName: string): FacilityCode;
  validateFacilityCode(code: string): boolean;
  deactivateFacilityCode(id: number): void;
  // AI 채팅 기록
  getChatHistory(volunteerId: number, limit?: number): AiChat[];
  saveChat(volunteerId: number, role: string, content: string): AiChat;
  getAiUsageCount(volunteerId: number): number;
  getAllAiChats(): AiChat[];
}

export class SqliteStorage implements IStorage {
  getVolunteer(id: number): Volunteer | undefined {
    return db.select().from(volunteers).where(eq(volunteers.id, id)).get();
  }
  getAllVolunteers(): Volunteer[] {
    return db.select().from(volunteers).all();
  }
  createVolunteer(data: InsertVolunteer): Volunteer {
    return db.insert(volunteers).values(data).returning().get();
  }
  updateVolunteer(id: number, data: Partial<InsertVolunteer>): Volunteer | undefined {
    return db.update(volunteers).set(data).where(eq(volunteers.id, id)).returning().get();
  }
  getRecord(id: number): Record | undefined {
    return db.select().from(records).where(eq(records.id, id)).get();
  }
  getRecordsByVolunteer(volunteerId: number): Record[] {
    return db.select().from(records)
      .where(eq(records.volunteerId, volunteerId))
      .orderBy(desc(records.date))
      .all();
  }
  createRecord(data: InsertRecord): Record {
    const now = new Date().toISOString();
    return db.insert(records).values({ ...data, createdAt: now }).returning().get();
  }
  updateRecord(id: number, data: Partial<InsertRecord>): Record | undefined {
    return db.update(records).set(data).where(eq(records.id, id)).returning().get();
  }
  deleteRecord(id: number): void {
    db.delete(records).where(eq(records.id, id)).run();
  }
  getStats(volunteerId: number) {
    const all = this.getRecordsByVolunteer(volunteerId);
    const totalSessions = all.length;
    const totalYouth = all.reduce((s, r) => s + r.youthCount, 0);
    const issueBreakdown: { [k: string]: number } = {};
    const routineBreakdown: { [k: string]: number } = {};
    all.forEach(r => {
      issueBreakdown[r.coreIssue] = (issueBreakdown[r.coreIssue] || 0) + 1;
      try {
        (JSON.parse(r.routineChecks) as string[]).forEach(c => {
          routineBreakdown[c] = (routineBreakdown[c] || 0) + 1;
        });
      } catch {}
    });
    return { totalSessions, totalYouth, issueBreakdown, routineBreakdown, recentRecords: all.slice(0, 5) };
  }
  createSurvey(data: InsertSurvey): SurveyResponse {
    const now = new Date().toISOString();
    return db.insert(surveyResponses).values({ ...data, createdAt: now }).returning().get();
  }
  getSurveyByVolunteer(volunteerId: number): SurveyResponse | undefined {
    return db.select().from(surveyResponses)
      .where(eq(surveyResponses.volunteerId, volunteerId))
      .get();
  }
  getAllSurveys(): SurveyResponse[] {
    return db.select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt)).all();
  }
  getAllRecords(): Record[] {
    return db.select().from(records).orderBy(desc(records.date)).all();
  }
  getAllFacilityCodes(): FacilityCode[] {
    return db.select().from(facilityCodes).orderBy(desc(facilityCodes.createdAt)).all();
  }
  createFacilityCode(code: string, facilityName: string): FacilityCode {
    const now = new Date().toISOString();
    return db.insert(facilityCodes).values({ code: code.toUpperCase(), facilityName, isActive: 1, createdAt: now }).returning().get();
  }
  validateFacilityCode(code: string): boolean {
    const row = db.select().from(facilityCodes)
      .where(eq(facilityCodes.code, code.toUpperCase()))
      .get();
    return !!row && row.isActive === 1;
  }
  deactivateFacilityCode(id: number): void {
    db.update(facilityCodes).set({ isActive: 0 }).where(eq(facilityCodes.id, id)).run();
  }
  getChatHistory(volunteerId: number, limit = 30): AiChat[] {
    return db.select().from(aiChats)
      .where(eq(aiChats.volunteerId, volunteerId))
      .orderBy(desc(aiChats.createdAt))
      .limit(limit)
      .all()
      .reverse();
  }
  saveChat(volunteerId: number, role: string, content: string): AiChat {
    const now = new Date().toISOString();
    return db.insert(aiChats).values({ volunteerId, role, content, createdAt: now }).returning().get();
  }
  getAiUsageCount(volunteerId: number): number {
    // 오늘 user 메시지 수 (일일 제한 확인용)
    const today = new Date().toISOString().slice(0, 10);
    return db.select().from(aiChats)
      .where(eq(aiChats.volunteerId, volunteerId))
      .all()
      .filter(c => c.role === 'user' && c.createdAt.startsWith(today))
      .length;
  }
  getAllAiChats(): AiChat[] {
    return db.select().from(aiChats).orderBy(desc(aiChats.createdAt)).all();
  }
}

export const storage = new SqliteStorage();
