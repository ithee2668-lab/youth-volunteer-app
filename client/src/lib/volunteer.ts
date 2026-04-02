// 현재 봉사자 ID를 메모리에 저장 (localStorage 대신)
let currentVolunteerId: number | null = null;

export function getCurrentVolunteerId(): number | null {
  return currentVolunteerId;
}

export function setCurrentVolunteerId(id: number | null) {
  currentVolunteerId = id;
}
