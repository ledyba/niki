import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Quill from 'quill'
import DiaryEditor from '@/components/DiaryEditor.vue'

// ツールバーは Quill に生成させず、DiaryEditor のテンプレートが持つマークアップを
// modules.toolbar.container として渡している。この形は「静かに効かなくなる」壊れ方を
// する: Toolbar#attach は class から 'ql-' 始まりの名前を拾って書式を決め、
// 知らない書式なら debug.warn(既定で出ない)して黙って戻る。つまり class 名を打ち
// 間違えたボタンは、見た目はそのまま並ぶのに押しても何も起きない。
//
// なので「ボタンが在るか」ではなく「Quill に紐付いたか」を見る。Toolbar#controls は
// attach に成功したものだけが入る。
function attachedFormats(vm: unknown): Array<string> {
  const quill = (vm as { quill: Quill }).quill
  const toolbar = quill.getModule('toolbar') as { controls: Array<[string, HTMLElement]> }
  return toolbar.controls.map(([format]) => format)
}

describe('DiaryEditor.vue: 自前ツールバーの配線', () => {
  // Quill は document に selection-change のリスナを張るので、放置すると
  // インスタンスがテストファイルの最後まで生き残る。
  const mounted: Array<{ unmount: () => void }> = []
  afterEach(() => {
    while (mounted.length > 0) {
      mounted.pop()?.unmount()
    }
  })

  function mountEditor() {
    // focused は既定の false のまま。mounted() の focus 経路は通らないので、
    // jsdom で落ちる quill.focus() を差し替える必要はない。
    const wrapper = mount(DiaryEditor, { props: { content: '' } })
    mounted.push(wrapper)
    return wrapper
  }

  it('マークアップに並べた書式が全て Quill に紐付く', () => {
    const attached = attachedFormats(mountEditor().vm)
    for (const format of [
      // 狭い画面でも出すもの
      'bold', 'italic', 'underline', 'strike',
      'header', 'list', 'blockquote', 'code-block', 'link', 'image', 'clean',
      // 広い画面だけのもの
      'script', 'indent', 'direction', 'size', 'color', 'background', 'font', 'align', 'video',
    ]) {
      expect(attached).toContain(format)
    }
  })

  it('広い画面だけのボタンには専用のクラスが付いている(CSS で畳む対象)', () => {
    const wrapper = mountEditor()
    // 狭い画面で消すのは Quill の内部クラスではなく自分のクラス。ここが消えると
    // メディアクエリの当て先が無くなり、スマホでツールバーが折り返して画面を占める。
    const wide = wrapper.findAll('.editor-toolbar__wide')
    expect(wide.length).toBeGreaterThan(0)
    // 消える側に link/bold など日記で要るものが混ざっていないこと。
    for (const group of wide) {
      for (const kept of ['ql-bold', 'ql-italic', 'ql-underline', 'ql-strike', 'ql-list', 'ql-link', 'ql-image', 'ql-clean', 'ql-blockquote', 'ql-code-block']) {
        expect(group.find('.' + kept).exists()).toBe(false)
      }
    }
    // 見出しは「H1/H2 ボタンは畳むがドロップダウンは残す」ので、残る側にある。
    const header = wrapper.find('select.ql-header')
    expect(header.exists()).toBe(true)
    expect(header.element.closest('.editor-toolbar__wide')).toBeNull()
  })
})
