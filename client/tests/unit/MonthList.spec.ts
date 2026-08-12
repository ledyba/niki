import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import MonthList from '@/components/MonthList.vue'

// 狭い画面では月一覧を畳んでおく(出し分け自体は CSS のメディアクエリなので、
// ここで検証できるのは開閉の状態だけ)。畳む/開くの状態はコンポーネントが持つ。
function mountAt(path: string) {
  // watch('$route.path') が効くかどうかまで見たいので、素のオブジェクトではなく
  // reactive にしておく。
  const route = reactive({ path: path })
  const wrapper = mount(MonthList, {
    props: { months: ['2026/08', '2026/07', '2026/06'] },
    global: {
      mocks: { $route: route },
      stubs: { RouterLink: RouterLinkStub },
    },
  })
  return { wrapper, route }
}

describe('MonthList.vue: 狭い画面向けの折りたたみ', () => {
  it('最初は畳まれていて、いま見ている月をトグルに出す', () => {
    const { wrapper } = mountAt('/2026/08')

    const toggle = wrapper.get('.month__toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toContain('2026/08')
    expect(wrapper.get('.month__items').classes()).not.toContain('month__items--open')
  })

  it('トグルを押すと開き、もう一度押すと閉じる', async () => {
    const { wrapper } = mountAt('/2026/08')

    await wrapper.get('.month__toggle').trigger('click')
    expect(wrapper.get('.month__toggle').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.month__items').classes()).toContain('month__items--open')

    await wrapper.get('.month__toggle').trigger('click')
    expect(wrapper.get('.month__items').classes()).not.toContain('month__items--open')
  })

  it('月を選んだら畳む(開いたままだと本文が一覧に押し出されて見えない)', async () => {
    const { wrapper, route } = mountAt('/2026/08')
    await wrapper.get('.month__toggle').trigger('click')
    expect(wrapper.get('.month__items').classes()).toContain('month__items--open')

    // router-link での遷移 = ルートの path が変わる、を再現する。
    route.path = '/2026/07'
    await nextTick()

    expect(wrapper.get('.month__items').classes()).not.toContain('month__items--open')
    expect(wrapper.get('.month__toggle').text()).toContain('2026/07')
  })

  it('一覧に無い月を開いていてもトグルにその月を出す', () => {
    // buildMonths の範囲外(未来の月など)を直接開いたケース。
    const { wrapper } = mountAt('/2027/01')
    expect(wrapper.get('.month__toggle').text()).toContain('2027/01')
  })
})
