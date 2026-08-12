import { describe, it, expect, afterEach, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import IndexPage from '@/views/IndexPage.vue'
import type * as protocol from 'server/protocol'

// 退行テスト: updateDiaries に世代ガードが無いと、月フェッチの解決順が
// 入れ替わったときに別の月のエントリがこの月のページに紛れ込む。
// buildDiaries は取得したオブジェクトをそのまま格納するので、3月のエントリは
// year/month を 3月 のまま保って 4月のページに並ぶ。DiaryEntry の data-date も
// onEditorChange の payload も diary.year/month/day から作られるので、
// 画面に出ている日とは別の日へ POST してしまう。
// 「今日以外の日も編集できる」ようになって初めて意味を持つ経路。

type FetchDeferred = {
  url: string,
  resolve: (body: protocol.Diaries.Response) => void,
}

// route.params は文字列で来る。beforeRouteUpdate の引数もこの形。
type RouteLike = { params: Record<string, string> }
type RouteUpdateHook = (this: unknown, route: RouteLike) => unknown

function stubFetch(): Array<FetchDeferred> {
  const deferreds: Array<FetchDeferred> = []
  vi.stubGlobal('fetch', (url: string) => new Promise((resolve) => {
    deferreds.push({
      url: url,
      resolve: (body) => resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response),
    })
  }))
  return deferreds
}

function response(year: number, month: number, day: number, text: string): protocol.Diaries.Response {
  return {
    months: [`${year}/${('00' + month).slice(-2)}`],
    diaries: [{ year: year, month: month, day: day, text: text }],
  }
}

function mountAt(year: string, month: string) {
  return shallowMount(IndexPage, {
    global: {
      mocks: {
        $route: { params: { year: year, month: month } },
      },
    },
  })
}

// beforeRouteUpdate は vue-router のオプションなので defineComponent の型には
// 現れない。ルータを立てずに月の移動を再現するため、直接取り出して呼ぶ。
const beforeRouteUpdate = (IndexPage as unknown as { beforeRouteUpdate: RouteUpdateHook }).beforeRouteUpdate

describe('IndexPage.vue: 月フェッチの世代ガード', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('月を移った後に届いた前の月の応答を捨て、新しい月の応答だけを反映する', async () => {
    const deferreds = stubFetch()
    // 2025/03 を開く。この時点では応答を返さない(回線が遅い状況)。
    const wrapper = mountAt('2025', '03')
    expect(deferreds.map((it) => it.url)).toEqual(['/diaries/2025/03'])

    // 2025/04 へ移動する。resetSaveState() → year/month 更新 → updateDiaries()
    // の順序がガードの前提なので、その順序ごと本物のフックで再現する。
    await beforeRouteUpdate.call(wrapper.vm, { params: { year: '2025', month: '04' } })
    expect(deferreds.map((it) => it.url)).toEqual(['/diaries/2025/03', '/diaries/2025/04'])

    // 3月の応答が後から解決する。
    deferreds[0].resolve(response(2025, 3, 10, '3月の日記'))
    await flushPromises()
    expect(wrapper.vm.diaries.filter((it) => it.month !== 4)).toEqual([])

    // 4月の応答は当然反映される(ガードが効きすぎて全部落とすことはない)。
    deferreds[1].resolve(response(2025, 4, 10, '4月の日記'))
    await flushPromises()
    expect(wrapper.vm.diaries).toHaveLength(30)
    expect(wrapper.vm.diaries.every((it) => it.year === 2025 && it.month === 4)).toBe(true)
    expect(wrapper.vm.diaries.find((it) => it.day === 10)?.text).toBe('4月の日記')
  })

  it('月を移らなければ初回の応答はそのまま反映される', async () => {
    const deferreds = stubFetch()
    const wrapper = mountAt('2025', '03')

    // beforeMount からの初回は resetSaveState を経ないので saveSeq は 0 のまま。
    deferreds[0].resolve(response(2025, 3, 10, '3月の日記'))
    await flushPromises()

    expect(wrapper.vm.diaries).toHaveLength(31)
    expect(wrapper.vm.diaries.every((it) => it.year === 2025 && it.month === 3)).toBe(true)
    expect(wrapper.vm.diaries.find((it) => it.day === 10)?.text).toBe('3月の日記')
  })
})
