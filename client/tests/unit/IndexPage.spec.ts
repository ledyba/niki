import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, shallowMount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import Quill from 'quill'
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
  method: string,
  resolve: (body: protocol.Diaries.Response) => void,
}

// マウントしたページは document/window にリスナを張る。テストを跨いで
// 生き残ると、後のテストのイベントにも反応して fetch を増やしてしまう。
enableAutoUnmount(afterEach)

// route.params は文字列で来る。beforeRouteUpdate の引数もこの形。
type RouteLike = { params: Record<string, string> }
type RouteUpdateHook = (this: unknown, route: RouteLike) => unknown

function stubFetch(): Array<FetchDeferred> {
  const deferreds: Array<FetchDeferred> = []
  vi.stubGlobal('fetch', (url: string, init?: { method?: string }) => new Promise((resolve) => {
    deferreds.push({
      url: url,
      method: init?.method ?? 'get',
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

// 画面から離れた/戻ってきたことを再現する。jsdom の document.visibilityState は
// prototype の getter なので、インスタンス側に生やして被せる。
function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

function restoreVisibility() {
  delete (document as unknown as Record<string, unknown>).visibilityState
}

// bfcache からの復元。jsdom には PageTransitionEvent が無いので、
// 素の Event に persisted を生やして代用する。
function firePageShow(persisted: boolean) {
  window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: persisted }))
}

describe('IndexPage.vue: 戻ってきたときの取り直し', () => {
  // 2025/03/10 12:00 に 2025/03 を開いている状態から始める。
  const opened = new Date(2025, 2, 10, 12, 0, 0)

  beforeEach(() => {
    // Date だけを固定する。setTimeout まで止めると flushPromises が返らない。
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(opened)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    restoreVisibility()
  })

  async function open() {
    const deferreds = stubFetch()
    const wrapper = mountAt('2025', '03')
    deferreds[0].resolve(response(2025, 3, 10, '開いたときの日記'))
    await flushPromises()
    return { deferreds, wrapper }
  }

  it('60秒以上離れて戻ると取り直す', async () => {
    const { deferreds, wrapper } = await open()

    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 10, 12, 1, 1))
    setVisibility('visible')

    expect(deferreds.map((it) => it.url)).toEqual(['/diaries/2025/03', '/diaries/2025/03'])

    // 別の端末で書かれた本文がここで入れ替わる。これがこの機能の目的。
    deferreds[1].resolve(response(2025, 3, 10, '別の端末で書いた日記'))
    await flushPromises()
    expect(wrapper.vm.diaries.find((it) => it.day === 10)?.text).toBe('別の端末で書いた日記')
  })

  it('短い離脱では取り直さない', async () => {
    const { deferreds } = await open()

    // 共有シートを閉じた程度の往復。ここで毎回取り直すと編集の邪魔になる。
    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 10, 12, 0, 30))
    setVisibility('visible')

    expect(deferreds).toHaveLength(1)
  })

  it('未保存の編集があるときは取り直さない', async () => {
    const { deferreds, wrapper } = await open()

    // まだ送れていない編集。サーバの本文で上書きすると消えてしまう。
    wrapper.vm.pending.set('2025/03/10', { year: 2025, month: 3, day: 10, text: 'まだ送っていない' })

    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 10, 13, 0, 0))
    setVisibility('visible')

    expect(deferreds).toHaveLength(1)
  })

  it('bfcache から復元されたときも取り直す(pagehide が基準時刻を持つ)', async () => {
    const { deferreds } = await open()

    // 他サイトへ移動して戻る経路。visibilitychange(hidden) は来ない。
    window.dispatchEvent(new Event('pagehide'))
    vi.setSystemTime(new Date(2025, 2, 10, 13, 0, 0))
    firePageShow(true)

    expect(deferreds).toHaveLength(2)
  })

  it('復元でない pageshow では取り直さない', async () => {
    const { deferreds } = await open()

    window.dispatchEvent(new Event('pagehide'))
    vi.setSystemTime(new Date(2025, 2, 10, 13, 0, 0))
    firePageShow(false)

    expect(deferreds).toHaveLength(1)
  })

  it('復元で両方のイベントが来ても取り直しは1回だけ', async () => {
    const { deferreds } = await open()

    window.dispatchEvent(new Event('pagehide'))
    vi.setSystemTime(new Date(2025, 2, 10, 13, 0, 0))
    firePageShow(true)
    setVisibility('visible')

    expect(deferreds).toHaveLength(2)
  })

  it('日をまたいでいたら開いているエディタを今日へ振り直す', async () => {
    const { wrapper } = await open()
    expect(wrapper.vm.editingDate).toBe('2025/03/10')

    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 11, 9, 0, 0))
    setVisibility('visible')

    expect(wrapper.vm.editingDate).toBe('2025/03/11')
  })

  it('意図して開いた過去の日は日をまたいでも閉じない', async () => {
    const { wrapper } = await open()
    // ユーザーが自分で 3/5 を開いた。
    wrapper.vm.editingDate = '2025/03/05'

    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 11, 9, 0, 0))
    setVisibility('visible')

    expect(wrapper.vm.editingDate).toBe('2025/03/05')
  })

  it('アンマウント後はイベントを拾わない', async () => {
    const { deferreds, wrapper } = await open()
    wrapper.unmount()

    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 10, 13, 0, 0))
    setVisibility('visible')

    expect(deferreds).toHaveLength(1)
  })
})

describe('IndexPage.vue: 取り直しが書き戻しを誘発しない', () => {
  // 退行テスト: Quill は dangerouslyPasteHTML のような API 起因の変更でも
  // text-change を投げる。DiaryEditor がそれを素通しすると、取り直しで
  // 入れた「別の端末の本文」が「ユーザーの編集」として親に伝わり、
  // そのままサーバへ書き戻される。取り込み→保存の往復になり、updated が
  // 無意味に進み、相手が編集中なら ping-pong になる。
  //
  // この経路は DiaryEditor が実際に存在しないと再現しないので、
  // ここだけ shallowMount ではなく mount を使う。

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2025, 2, 10, 12, 0, 0))
    // jsdom では Quill の focus/setSelection が落ちる。今日のエディタは
    // mounted で focus() されるので、そこだけ差し替える。
    vi.spyOn(Quill.prototype, 'focus').mockImplementation(() => {})
    vi.spyOn(Quill.prototype, 'setSelection').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreVisibility()
  })

  it('別の端末の本文を取り込んでも POST は飛ばない', async () => {
    const deferreds = stubFetch()
    const wrapper = mount(IndexPage, {
      global: {
        mocks: { $route: { params: { year: '2025', month: '03' }, path: '/2025/03' } },
        stubs: { RouterLink: true },
      },
    })
    deferreds[0].resolve(response(2025, 3, 10, '<p>もとの本文</p>'))
    await flushPromises()
    // Quill の初期化は requestAnimationFrame を挟む。
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(wrapper.findComponent({ name: 'quill-editor' }).exists()).toBe(true)

    setVisibility('hidden')
    vi.setSystemTime(new Date(2025, 2, 10, 13, 0, 0))
    setVisibility('visible')
    expect(deferreds).toHaveLength(2)

    deferreds[1].resolve(response(2025, 3, 10, '<p>別の端末で書いた本文</p>'))
    await flushPromises()
    // 保存のデバウンス(200ms)を実時間で越えさせる。Date だけを固定して
    // setTimeout は本物のままにしてあるのはこのため。
    await new Promise((resolve) => setTimeout(resolve, 400))
    await flushPromises()

    expect(deferreds.map((it) => it.method)).toEqual(['get', 'get'])
    expect(wrapper.vm.pending.size).toBe(0)
    expect(wrapper.vm.saving).toBe(false)
  })
})
