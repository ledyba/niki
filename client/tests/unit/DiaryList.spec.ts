import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiaryList from '@/components/DiaryList.vue'
import type * as protocol from 'server/protocol'

// 退行テスト: DiaryEntry / DiaryEditor が emits を宣言していないと、Vue 3 は
// v-on:change をカスタムイベントに加えてルート要素へのネイティブ DOM リスナ
// としても付けてしまう。Quill のツールバー(ファイル選択・リンク入力など)の
// <input> が発火する change がバブリングして拾われ、onEditorChange /
// onDiaryChange に素の Event が渡ってしまう(→ 壊れた日付キーが保存キューに
// 積まれる)。ここでは Quill を動かさず、DiaryEntry のルート要素に直接
// ネイティブ change を投げて、diary-change が発火しないことだけを確認する。
describe('DiaryList.vue: ネイティブ change のフォールスルー対策', () => {
  const diaries: Array<protocol.Entity.Diary> = [
    { year: 2026, month: 8, day: 7, text: '' },
  ]

  it('DiaryEntry のルート要素へのネイティブ change では diary-change が発火しない', async () => {
    const wrapper = mount(DiaryList, {
      props: { diaries, editingDate: null },
    })
    const entryRoot = wrapper.find('.diary[data-date="2026/08/07"]')
    expect(entryRoot.exists()).toBe(true)

    entryRoot.element.dispatchEvent(new Event('change', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('diary-change')).toBeUndefined()
  })
})
