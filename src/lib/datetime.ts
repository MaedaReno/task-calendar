// このアプリは JST(Asia/Tokyo) 固定で日時を扱う。
// datetime-local / date / time 入力の「壁時計」値は常に JST として解釈する。
// ブラウザのローカルタイムゾーンに依存して new Date(localString) で変換すると
// JST 以外の環境で時刻がズレるため、必ずこのヘルパーを経由する。

const JST_OFFSET = "+09:00";
const JST_MS = 9 * 60 * 60 * 1000;

// UTC ISO 文字列 → JST の "YYYY-MM-DD"
export function utcToJSTDate(utc: string): string {
  return new Date(new Date(utc).getTime() + JST_MS).toISOString().slice(0, 10);
}

// UTC ISO 文字列 → JST の "HH:mm"
export function utcToJSTTime(utc: string): string {
  return new Date(new Date(utc).getTime() + JST_MS).toISOString().slice(11, 16);
}

// UTC ISO 文字列 → datetime-local 用の JST 壁時計 "YYYY-MM-DDTHH:mm"
export function utcToJSTInput(utc: string): string {
  return new Date(new Date(utc).getTime() + JST_MS).toISOString().slice(0, 16);
}

// JST の壁時計("YYYY-MM-DD", "HH:mm") → UTC ISO 文字列
export function jstToUTC(date: string, time: string): string {
  return new Date(`${date}T${time}:00${JST_OFFSET}`).toISOString();
}

// JST の今日 "YYYY-MM-DD"
export function todayJST(): string {
  return new Date(Date.now() + JST_MS).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" に n 日加算した "YYYY-MM-DD" を返す
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00${JST_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return new Date(d.getTime() + JST_MS).toISOString().slice(0, 10);
}
