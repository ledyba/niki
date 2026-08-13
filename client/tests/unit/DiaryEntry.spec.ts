import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiaryEntry from '@/components/DiaryEntry.vue'

// 退行テスト: 表示側(編集していない日)の本文は、Quill と同じクラスの入れ子
// (.ql-snow > .ql-editor)の中に流し込む。
//
// Quill が保存する HTML では、箇条書きの階層は <ol> の入れ子ではなく <li> の
// data-list 属性と ql-indent-N クラスで表されていて、字下げも行頭のマーカーも
// .ql-editor 配下の CSS でしか描かれない。素の <div> に流し込むと階層が消え、
// 中身は常に <ol> なので箇条書きまで連番になる。引用・コードブロック・見出しの
// 体裁はさらに祖先の .ql-snow を要求するので、1枚の div に両方のクラスを
// 付けるのでは足りない。
//
// jsdom は quill の CSS を読まないので、ここで固定できるのは「クラスの構造」まで。
// 実際の見え方(字下げ・マーカー)は .claude/skills/run-niki のドライバで
// 実ブラウザから撮って確認する。
describe('DiaryEntry.vue: 表示側の本文', () => {
  const text = '<ol>' +
    '<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>a</li>' +
    '<li data-list="bullet" class="ql-indent-1"><span class="ql-ui" contenteditable="false"></span>b</li>' +
    '</ol>'

  it('.ql-snow > .ql-editor の中に描画され、Quill のクラスと属性がそのまま残る', () => {
    const wrapper = mount(DiaryEntry, {
      props: { diary: { year: 2026, month: 8, day: 7, text }, editing: false },
    })

    const body = wrapper.find('.diary__body')
    expect(body.classes()).toContain('ql-snow')

    // .ql-editor は .diary__body の直接の子。子孫セレクタ
    // (.ql-snow .ql-editor blockquote 等)が効くのはこの入れ子があってこそ。
    const editor = wrapper.find('.diary__body > .ql-editor')
    expect(editor.exists()).toBe(true)

    const items = editor.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].attributes('data-list')).toBe('bullet')
    // 階層はこのクラスだけが持っている。落とすと 2 行が同じ深さになる。
    expect(items[1].classes()).toContain('ql-indent-1')
    // マーカーは li > .ql-ui::before の content で描かれるので、この span も要る。
    expect(items[1].find('.ql-ui').exists()).toBe(true)
  })

  it('編集中は表示側の本文を出さない(エディタ自身が .ql-editor を持つ)', () => {
    const wrapper = mount(DiaryEntry, {
      props: { diary: { year: 2026, month: 8, day: 7, text }, editing: true },
      global: { stubs: { DiaryEditor: true } },
    })

    expect(wrapper.find('.diary__body').exists()).toBe(false)
  })
})
