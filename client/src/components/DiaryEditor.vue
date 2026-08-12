<template>
  <div class="quill-editor">
    <slot name="toolbar"></slot>
    <div ref="editor"></div>
  </div>
</template>

<script lang="ts">
// https://github.com/surmon-china/vue-quill-editor
import { defineComponent } from 'vue';
import Quill, {type QuillOptions} from 'quill';
import type {ToolbarConfig} from 'quill/modules/toolbar';
import { isMobile } from '@/media';
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'

export interface EditorChangeEvent {
  quill: Quill;
  html: string;
  text: string;
}

// 広い画面用。全部盛り。
const FULL_TOOLBAR: ToolbarConfig = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ 'header': 1 }, { 'header': 2 }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'script': 'sub' }, { 'script': 'super' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'direction': 'rtl' }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'font': [] }],
  [{ 'align': [] }],
  ['clean'],
  ['link', 'image', 'video']
];

// 狭い画面用。全部盛りのままだと6〜7行に折り返して画面をツールバーで埋めてしまうので、
// 日記で実際に使うものだけ残す。落とすのは font / size / color / background / align /
// direction(RTL) / script(上付き下付き) / indent / video と、見出しの1・2ボタン
// (見出しはドロップダウン側に残るので機能自体は失われない)。
const COMPACT_TOOLBAR: ToolbarConfig = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'header': [1, 2, 3, false] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['clean']
];

/**
 * 画面幅に応じたツールバー構成を返す。
 *
 * Quill 2 はツールバーの構成をインスタンス生成時にしか受け取らない。生成後に
 * 差し替える API は無く(modules/toolbar にあるのは addHandler/attach/update だけ)、
 * Quill 自体にも destroy が無い。したがって「CSS でボタンを隠す」のではなく
 * 「渡す設定そのものを選ぶ」のが公開 API だけで完結する唯一のやり方になる。
 * CSS で隠す方式は .ql-font などの内部クラス名に依存するぶん、Quill の更新で
 * 静かに壊れる。
 *
 * 生成時にしか効かないので、境界をまたいだときはエディタごと作り直す必要がある。
 * それは DiaryEntry 側が :key で面倒を見ている。
 */
export function toolbarConfig(compact: boolean): ToolbarConfig {
  return compact ? COMPACT_TOOLBAR : FULL_TOOLBAR;
}

function buildOptions(compact: boolean): QuillOptions {
  return {
    theme: 'snow',
    bounds: document.body,
    modules: {
      toolbar: toolbarConfig(compact),
    },
    placeholder: 'Insert text here ...',
    readOnly: false
  };
}

const DiaryEditor = defineComponent({
  name: 'quill-editor',
  // emits を宣言しないと、Vue 3 は同名の v-on をカスタムイベントに加えて
  // ルート要素(.quill-editor)へのネイティブ DOM リスナとしても付ける。
  // Quill のツールバーは <input type="file" class="ql-image"> や
  // リンク/動画ツールチップの <input type="text"> をこのルート div の
  // 内側に生成するので、宣言していないと画像選択やリンク確定でバブリング
  // した change を拾ってしまい、親の change ハンドラに素の Event が渡る。
  emits: ['change', 'blur', 'focus', 'input', 'ready'],
  data: function() {
    return {
      options_: {} as QuillOptions,
      content_: '',
      quill: null as (Quill | null),
    };
  },
  props: {
    content: String,
    disabled: {
      type: Boolean,
      default: false
    },
    focused: {
      type: Boolean,
      required: false,
      default: () => false
    }
  },
  mounted: function() {
    this.initialize();
    if(this.focused) {
      window.requestAnimationFrame(()=>{
        this.focus();
      });
    }
  },
  beforeUnmount: function() {
    this.quill = null;
  },
  methods: {
    // Init Quill instance
    initialize: function () {
      if (this.$el) {
        // Set editor content
        if (this.content !== undefined) {
          //this.quill.clipboard.dangerouslyPasteHTML(this.content);
          (this.$refs.editor as HTMLDivElement).innerHTML = this.content;
        }
        // Instance
        // ツールバーはここで確定する。以降は差し替えられない (toolbarConfig の注記参照)。
        this.quill = new Quill(this.$refs.editor as HTMLElement, buildOptions(isMobile.value));
        this.quill.blur();
        this.quill.enable(!this.disabled);
        // Mark model as touched if editor lost focus
        this.quill.on('selection-change', range => {
          if (!range) {
            this.$emit('blur', this.quill);
          } else {
            this.$emit('focus', this.quill);
          }
        });
        // Update model if text changes
        this.quill.on('text-change', () => {
          if(this.quill === null) {
            return;
          }
          let html = (this.$refs.editor as HTMLElement).children[0].innerHTML;
          const quill = this.quill as Quill;
          const text = this.quill.getText();
          if (html === '<p><br></p>') html = '';
          this.content_ = html;
          this.$emit('input', this.content_);
          const event: EditorChangeEvent = {
            html: html,
            text: text,
            quill: quill,
          };
          this.$emit('change', event);
        });
        // Emit ready event
        this.$emit('ready', this.quill);
      }
    },
    focus: function () {
      if(this.quill !== null) {
        this.quill.focus();
        this.quill.setSelection(this.quill.getLength(),0);
      }
    }
  },
  watch: {
    // Watch content change
    content: function (newVal, oldVal) {
      if (this.quill) {
        // 自分の text-change 由来で親が書き戻した内容は無視する。
        // ここを素通しすると、本文を全消しした時に setText('') が跳ね返る。
        if (newVal === this.content_) {
          return;
        }
        if (newVal && newVal !== oldVal) {
          this.content_ = newVal
          this.quill.clipboard.dangerouslyPasteHTML(newVal);
        } else if (!newVal) {
          this.content_ = ''
          this.quill.setText('')
        }
      }
    },
    focused: function (newVal, oldVal) {
      if (this.quill !== null && newVal !== oldVal) {
        if(newVal) {
          window.requestAnimationFrame(()=>{
            this.focus();
          });
        }
      }
    },
    // Watch disabled change
    disabled: function (newVal, oldVal) {
      if (this.quill !== null && newVal !== oldVal) {
        this.quill.enable(!newVal);
      }
    },
  }
});

export default DiaryEditor;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
