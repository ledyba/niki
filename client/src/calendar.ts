// カレンダー(月/日)まわりの純粋関数。IndexPage.vue / DiaryList.vue /
// DiaryEntry.vue の "0000${year}".slice(-4) 等の重複を集約する。
import type * as protocol from 'server/protocol';
import dayjs from 'dayjs';

export function formatMonth(year: number, month: number): string {
  return `${('0000'+year).slice(-4)}/${('00'+month).slice(-2)}`;
}

export function formatDate(year: number, month: number, day: number): string {
  return `${formatMonth(year, month)}/${('00'+day).slice(-2)}`;
}

/**
 * 今日の日付を 'YYYY/MM/DD' で返す。
 */
export function todayDate(): string {
  const now = dayjs();
  return formatDate(now.year(), now.month() + 1, now.date());
}

/**
 * 日記のある月だけが並んだサーバの応答から、
 * 「最古の月から今月まで」の連続した月のリストを作る(新しい順)。
 *
 * 今月はブラウザのローカル時刻で決める。サーバ(コンテナ)のタイムゾーンは
 * JST とは限らないので、月の範囲の上端をサーバに頼らない。
 */
export function buildMonths(existing: Array<string>): Array<string> {
  const now = dayjs();
  const current = formatMonth(now.year(), now.month() + 1);
  // 'YYYY/MM' は辞書順が時系列順なので、そのまま最小値を取れる。
  const oldest = existing.reduce((a, b) => (a < b ? a : b), current);
  const [oldestYear, oldestMonth] = oldest.split('/').map((it) => parseInt(it, 10));
  const months = new Set<string>();
  let cursor = dayjs(new Date(oldestYear, oldestMonth - 1, 1));
  const last = dayjs(new Date(now.year(), now.month(), 1));
  while (!cursor.isAfter(last)) {
    months.add(formatMonth(cursor.year(), cursor.month() + 1));
    cursor = cursor.add(1, 'month');
  }
  // 範囲外(未来など)の月がサーバから来ても取りこぼさない。
  for (const month of existing) {
    months.add(month);
  }
  return Array.from(months).sort().reverse();
}

/**
 * その月の全ての日を並べる(新しい順)。今月は今日までで打ち切る。
 * 日記のない日は空文字の Diary として埋める。
 */
export function buildDiaries(year: number, month: number, fetched: Array<protocol.Entity.Diary>): Array<protocol.Entity.Diary> {
  const now = dayjs();
  const daysInMonth = dayjs(new Date(year, month - 1, 1)).daysInMonth();
  const isCurrentMonth = now.year() === year && (now.month() + 1) === month;
  const last = isCurrentMonth ? Math.min(now.date(), daysInMonth) : daysInMonth;
  const byDay = new Map<number, protocol.Entity.Diary>();
  const days = new Set<number>();
  for (let day = 1; day <= last; ++day) {
    days.add(day);
  }
  // 打ち切りの外(未来の日など)に日記があっても消さない。
  for (const diary of fetched) {
    byDay.set(diary.day, diary);
    days.add(diary.day);
  }
  return Array.from(days)
      .sort((a, b) => b - a)
      .map((day) => byDay.get(day) ?? { year: year, month: month, day: day, text: '' });
}
