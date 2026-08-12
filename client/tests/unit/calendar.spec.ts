import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildMonths, buildDiaries, formatMonth, formatDate, todayDate } from '@/calendar'

// 「今日」を固定する。ローカル時刻で固定しないと (buildMonths/buildDiaries は
// dayjs のローカル時刻を使う) 負のタイムゾーンで日付がずれる。
const TODAY = new Date(2026, 7, 7, 12, 0, 0) // 2026/08/07 (local)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatMonth / formatDate / todayDate', () => {
  it('0埋めで YYYY/MM / YYYY/MM/DD を作る', () => {
    expect(formatMonth(2026, 8)).toBe('2026/08')
    expect(formatDate(2026, 8, 7)).toBe('2026/08/07')
  })

  it('todayDate は固定した今日を返す', () => {
    expect(todayDate()).toBe('2026/08/07')
  })
})

describe('buildMonths', () => {
  it('空配列なら今月だけ', () => {
    expect(buildMonths([])).toEqual(['2026/08'])
  })

  it('歯抜けの月から最古〜今月までの連続リストを降順で作る', () => {
    const months = buildMonths(['2025/03', '2026/01'])
    expect(months[0]).toBe('2026/08')
    expect(months.at(-1)).toBe('2025/03')
    // 降順であること
    expect(months).toEqual([...months].sort().reverse())
    // 連続していること(欠けがない)
    expect(months).toContain('2025/04')
    expect(months).toContain('2025/12')
    expect(months).toContain('2026/01')
    expect(months).toContain('2026/07')
    expect(months.length).toBe(18) // 2025/03 〜 2026/08
  })

  it('サーバが未来の月を返しても取りこぼさない', () => {
    // 「最古〜今月」の連続レンジの外(未来)にある月も、レンジに含めて残す。
    const months = buildMonths(['2025/06', '2026/12'])
    expect(months[0]).toBe('2026/12')
    expect(months).toContain('2026/08')
    expect(months).toContain('2025/06')
    expect(months).toContain('2026/01')
  })
})

describe('buildDiaries', () => {
  it('今月は1日〜今日までを降順で並べ、日記のない日は text: \'\' で埋める', () => {
    const diaries = buildDiaries(2026, 8, [
      { year: 2026, month: 8, day: 3, text: '<p>3日</p>' },
    ])
    expect(diaries.map((d) => d.day)).toEqual([7, 6, 5, 4, 3, 2, 1])
    expect(diaries.find((d) => d.day === 3)?.text).toBe('<p>3日</p>')
    expect(diaries.find((d) => d.day === 1)?.text).toBe('')
    expect(diaries.find((d) => d.day === 7)?.text).toBe('')
  })

  it('過去の月は全日を並べる(閏年2月=29日)', () => {
    const diaries = buildDiaries(2024, 2, [])
    expect(diaries.map((d) => d.day)).toEqual(
      Array.from({ length: 29 }, (_, i) => 29 - i)
    )
  })

  it('過去の月は全日を並べる(非閏年2月=28日)', () => {
    const diaries = buildDiaries(2025, 2, [])
    expect(diaries.map((d) => d.day)).toEqual(
      Array.from({ length: 28 }, (_, i) => 28 - i)
    )
  })

  it('打ち切りより後の日の日記が混ざっていても消えない', () => {
    // 今月(2026/08)は今日(7日)で打ち切るが、8日の日記がサーバから来た場合
    // 取りこぼさない。
    const diaries = buildDiaries(2026, 8, [
      { year: 2026, month: 8, day: 8, text: '<p>未来?</p>' },
    ])
    expect(diaries[0].day).toBe(8)
    expect(diaries[0].text).toBe('<p>未来?</p>')
    expect(diaries.map((d) => d.day)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('未来の月は1日も出さない(URL直打ちで来た場合)', () => {
    expect(buildDiaries(2027, 3, [])).toEqual([])
  })

  it('未来の月でも日記があればその日だけ出す', () => {
    const diaries = buildDiaries(2027, 3, [
      { year: 2027, month: 3, day: 10, text: '<p>未来?</p>' },
    ])
    expect(diaries.map((d) => d.day)).toEqual([10])
  })

  it('既存の日記の text が正しくマージされる', () => {
    const diaries = buildDiaries(2026, 7, [
      { year: 2026, month: 7, day: 1, text: '<p>1日</p>' },
      { year: 2026, month: 7, day: 31, text: '<p>31日</p>' },
    ])
    expect(diaries.find((d) => d.day === 1)?.text).toBe('<p>1日</p>')
    expect(diaries.find((d) => d.day === 31)?.text).toBe('<p>31日</p>')
    expect(diaries.find((d) => d.day === 15)?.text).toBe('')
    expect(diaries.length).toBe(31)
  })
})
