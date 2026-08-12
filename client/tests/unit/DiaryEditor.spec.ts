import { describe, it, expect } from 'vitest'
import { toolbarConfig } from '@/components/DiaryEditor.vue'

// Quill 2 はツールバーの構成をインスタンス生成時にしか受け取らない。後から差し替える
// API も destroy も無いので、狭い画面向けに絞るには「生成時に渡す設定を選ぶ」しかない。
// CSS で .ql-font などを隠す実装に戻すと Quill の内部クラス名に依存して静かに壊れるので、
// 設定側で絞れていることをここで固定しておく。
function formatsOf(config: ReturnType<typeof toolbarConfig>): Array<string> {
  const formats: Array<string> = []
  for (const group of config) {
    for (const control of group) {
      if (typeof control === 'string') {
        formats.push(control)
      } else {
        formats.push(...Object.keys(control))
      }
    }
  }
  return formats
}

describe('DiaryEditor.vue: 画面幅ごとのツールバー構成', () => {
  it('狭い画面では、折り返して画面を埋めてしまう重いボタンを外す', () => {
    const compact = formatsOf(toolbarConfig(true))
    // 日記では使わないものを落とす。ここに挙げたものが復活すると
    // スマホでツールバーが何行にも折り返す。
    for (const dropped of ['font', 'size', 'color', 'background', 'align', 'direction', 'script', 'indent', 'video']) {
      expect(compact).not.toContain(dropped)
    }
  })

  it('狭い画面でも日記に要るものは残す', () => {
    const compact = formatsOf(toolbarConfig(true))
    for (const kept of ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'blockquote', 'code-block', 'link', 'image', 'clean']) {
      expect(compact).toContain(kept)
    }
  })

  it('広い画面の構成は絞らない(狭い画面用より必ず多い)', () => {
    const full = toolbarConfig(false)
    const compact = toolbarConfig(true)
    expect(formatsOf(full).length).toBeGreaterThan(formatsOf(compact).length)
    // 行数(グループ数)も減っていること。折り返しの行数に効くのはこちら。
    expect(full.length).toBeGreaterThan(compact.length)
  })
})
