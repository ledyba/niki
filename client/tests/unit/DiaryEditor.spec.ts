import { describe, it, expect, afterEach, vi } from 'vitest'
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

describe('DiaryEditor.vue: 親から本文を差し替えたときのキャレット', () => {
  // 別の端末で書かれた本文を取り込む経路。clipboard.dangerouslyPasteHTML は
  // 差し替えたあと必ず setSelection(0, SILENT) を呼ぶので、キャレットが
  // 本文の先頭へ飛ぶ。さらに Quill の setNativeRange は「フォーカスが
  // 無ければ root.focus()」するため、触っていないエディタがフォーカスまで
  // 奪う。ここではその2つが起きないことを見る。
  const mounted: Array<{ unmount: () => void }> = []
  afterEach(() => {
    while (mounted.length > 0) {
      mounted.pop()?.unmount()
    }
    vi.restoreAllMocks()
  })

  function mountEditor(content: string) {
    const wrapper = mount(DiaryEditor, { props: { content: content } })
    mounted.push(wrapper)
    return wrapper
  }

  function quillOf(wrapper: { vm: unknown }): Quill {
    return (wrapper.vm as unknown as { quill: Quill }).quill
  }

  it('中身は差し替わる', async () => {
    const wrapper = mountEditor('<p>まえの本文</p>')
    await wrapper.setProps({ content: '<p>別の端末で書いた本文</p>' })
    expect(quillOf(wrapper).getText()).toBe('別の端末で書いた本文\n')
  })

  it('フォーカスの無いエディタではキャレットに触らない', async () => {
    const wrapper = mountEditor('<p>まえの本文</p>')
    // initialize() が blur() しているので、この時点で選択範囲は無い。
    expect(quillOf(wrapper).getSelection()).toBeNull()

    const setSelection = vi.spyOn(quillOf(wrapper), 'setSelection')
    await wrapper.setProps({ content: '<p>別の端末で書いた本文</p>' })

    // dangerouslyPasteHTML ならここで setSelection(0, 'silent') が呼ばれ、
    // その中で root.focus() までされていた。
    expect(setSelection).not.toHaveBeenCalled()
  })

  it('編集中だったキャレットは元の位置へ戻す', async () => {
    const wrapper = mountEditor('<p>まえの本文</p>')
    const quill = quillOf(wrapper)
    // jsdom では本物のフォーカスを作れないので、選択範囲だけ被せる。
    vi.spyOn(quill, 'getSelection').mockReturnValue({ index: 3, length: 0 })
    const setSelection = vi.spyOn(quill, 'setSelection')

    await wrapper.setProps({ content: '<p>じゅうぶんに長い別の端末の本文</p>' })

    expect(setSelection).toHaveBeenCalledWith(3, 0, 'silent')
  })

  it('取り込んだ本文の方が短ければ末尾に丸める', async () => {
    const wrapper = mountEditor('<p>じゅうぶんに長いもとの本文</p>')
    const quill = quillOf(wrapper)
    vi.spyOn(quill, 'getSelection').mockReturnValue({ index: 12, length: 0 })
    const setSelection = vi.spyOn(quill, 'setSelection')

    await wrapper.setProps({ content: '<p>みじかい</p>' })

    // 'みじかい' は4文字。getLength() は末尾の改行を含めて5を返す。
    expect(quill.getLength()).toBe(5)
    expect(setSelection).toHaveBeenCalledWith(4, 0, 'silent')
  })
})
