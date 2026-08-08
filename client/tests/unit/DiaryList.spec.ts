import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DiaryList from '@/components/DiaryList.vue'
import type * as protocol from 'server/protocol'
import Quill from 'quill'

// 退行テスト: DiaryEntry / DiaryList / DiaryEditor が emits を宣言していないと、
// Vue 3 は v-on:change をカスタムイベントに加えてルート要素へのネイティブ DOM
// リスナとしても付けてしまう。Quill のツールバー(ファイル選択・リンク入力など)
// の <input> が発火する change がバブリングして拾われ、onEditorChange /
// onDiaryChange に素の Event が渡ってしまう。
//
// この事故には2つの層がある:
//   外側(DiaryEntry/DiaryList): DiaryEntry 自身のルート要素で change を拾うと
//     ネイティブ Event がそのまま onDiaryChange に渡り、formatDate(undefined,...)
//     → 壊れた日付キーが保存キューに積まれる(前段のケースで固定済み)。
//   内側(DiaryEditor): DiaryEditor のルート(.quill-editor)で change を拾っても、
//     間に onEditorChange が挟まるので Event そのものは漏れない。代わりに
//     `{year, month, day, text: change.html}` の change.html が undefined になり
//     `{year, month, day, text: undefined}` が親に渡る。日付キーは正常なので
//     壊れたキーには気づけず、その日の本文が空(undefined)で静かに上書きされる。
//   editingDate: null のケースだけだと DiaryEditor が一度も描画されないので、
//   内側の経路(実際に Quill ツールバーの <input> が生えている場所)は検証できない。
//   そのため editingDate を該当日に合わせて DiaryEditor を実マウントさせる
//   2つ目のケースを別に用意する。
describe('DiaryList.vue: ネイティブ change のフォールスルー対策', () => {
  const diaries: Array<protocol.Entity.Diary> = [
    { year: 2026, month: 8, day: 7, text: '' },
  ]

  it('外側(DiaryEntry/DiaryList): DiaryEntry のルート要素へのネイティブ change では diary-change が発火しない', async () => {
    const wrapper = mount(DiaryList, {
      props: { diaries, editingDate: null },
    })
    const entryRoot = wrapper.find('.diary[data-date="2026/08/07"]')
    expect(entryRoot.exists()).toBe(true)

    entryRoot.element.dispatchEvent(new Event('change', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('diary-change')).toBeUndefined()
  })

  describe('内側(DiaryEditor): Quill が実際にマウントされる状態', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('DiaryEditor 描画時のネイティブ change でも diary-change が発火しない(壊れ方: text: undefined でその日の本文が消える)', async () => {
      // focused な DiaryEditor は mounted() で requestAnimationFrame 越しに
      // quill.focus() を呼ぶが、jsdom 下では選択範囲が無く
      // `TypeError: Cannot read properties of null (reading 'offset')` で
      // 落ちる。ここでは focus 自体の可否は検証対象ではないので黙らせる。
      vi.spyOn(Quill.prototype, 'focus').mockImplementation(() => {})

      // editingDate を対象日に合わせることで DiaryEntry の editing が true になり
      // DiaryEditor(Quill 込み)が実マウントされる。
      const wrapper = mount(DiaryList, {
        props: { diaries, editingDate: '2026/08/07' },
      })
      await wrapper.vm.$nextTick()

      const editorRoot = wrapper.find('.quill-editor')
      expect(editorRoot.exists()).toBe(true)

      // 実際の発火源は Quill ツールバー内の <input type="file"> / URL 入力欄
      // なので、.ql-toolbar 配下の要素があればそこから投げるのが実態に近い。
      // (無ければ .quill-editor の子要素から投げても、ルート要素へのネイティブ
      // リスナが付くバグ自体はバブリングで再現できる。)
      const toolbar = editorRoot.find('.ql-toolbar')
      const target = (toolbar.exists() ? toolbar : editorRoot).element

      target.dispatchEvent(new Event('change', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('diary-change')).toBeUndefined()
    })
  })
})
