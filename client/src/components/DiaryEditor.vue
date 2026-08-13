<template>
  <div class="quill-editor">
    <!--
      ツールバーは Quill に生成させず、自前のマークアップを渡す。
      Quill は modules.toolbar.container に要素を渡すと、その中の button/select を
      走査して ql- で始まるクラス名から書式を決め、アイコンの流し込みと
      ドロップダウン化(空の select は既定値で埋まる)まで面倒を見てくれる。
      こうしておくと「狭い画面で出さないボタン」を自分のクラス名で選べるので、
      画面幅の判定を CSS のメディアクエリだけで完結できる。
    -->
    <div ref="toolbar" class="editor-toolbar">
      <span class="ql-formats">
        <button class="ql-bold"></button>
        <button class="ql-italic"></button>
        <button class="ql-underline"></button>
        <button class="ql-strike"></button>
      </span>
      <span class="ql-formats">
        <select class="ql-header"></select>
      </span>
      <span class="ql-formats">
        <button class="ql-list" value="ordered"></button>
        <button class="ql-list" value="bullet"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-blockquote"></button>
        <button class="ql-code-block"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-link"></button>
        <button class="ql-image"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-clean"></button>
      </span>
      <!--
        ここから下は広い画面だけ。日記ではまず使わないうえ、全部出すと
        375px では6〜7行に折り返してツールバーが画面を占めてしまう。
      -->
      <span class="ql-formats editor-toolbar__wide">
        <button class="ql-header" value="1"></button>
        <button class="ql-header" value="2"></button>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <button class="ql-script" value="sub"></button>
        <button class="ql-script" value="super"></button>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <button class="ql-indent" value="-1"></button>
        <button class="ql-indent" value="+1"></button>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <button class="ql-direction" value="rtl"></button>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <select class="ql-size"></select>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <select class="ql-color"></select>
        <select class="ql-background"></select>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <select class="ql-font"></select>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <select class="ql-align"></select>
      </span>
      <span class="ql-formats editor-toolbar__wide">
        <button class="ql-video"></button>
      </span>
    </div>
    <div ref="editor"></div>
  </div>
</template>

<script lang="ts">
// https://github.com/surmon-china/vue-quill-editor
import { defineComponent } from 'vue';
import Quill, {type QuillOptions} from 'quill';
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'

export interface EditorChangeEvent {
  quill: Quill;
  html: string;
  text: string;
}

/**
 * Quill のオプション。ツールバーはテンプレート側の要素を渡す。
 *
 * Quill 2 は modules.toolbar.container に HTMLElement を受け取れる
 * (modules/toolbar.d.ts: `container?: HTMLElement | ToolbarConfig | null`)。
 * 要素を渡すと、その中の button/select を走査し ql- で始まるクラス名から書式を
 * 決めて紐付ける (Toolbar#attach)。アイコンの流し込みと select のドロップダウン化は
 * snow テーマの extendToolbar がやるので、空の <select class="ql-header"> でも
 * 既定の項目で埋まる。
 *
 * 構成の配列を渡す形だと、ツールバーは生成時にしか決まらない (後から差し替える API も
 * Quill#destroy も無い) ため、画面幅で出し分けるにはエディタごと作り直すしかない。
 * 要素を渡す形なら出し分けは自分のクラス名 (editor-toolbar__wide) への
 * メディアクエリで済み、幅の判定が JS 側に一切要らない。日本語入力の変換中に
 * 作り直して変換中の文字を失う、といった事故も起きない。
 */
function buildOptions(toolbar: HTMLElement): QuillOptions {
  return {
    theme: 'snow',
    bounds: document.body,
    modules: {
      // 要素であることが明らかな形で渡す。snow テーマは
      // `options.modules.toolbar.container == null` のとき既定の構成で
      // 上書きしてくるので、container を明示しておく。
      toolbar: { container: toolbar },
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
        this.quill = new Quill(this.$refs.editor as HTMLElement, buildOptions(this.$refs.toolbar as HTMLElement));
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
@use '../styles/breakpoints' as bp;

@media (max-width: bp.$mobile-max) {
  // 狭い画面では日記に要るものだけ残す。ツールバーの中身は自前のマークアップなので、
  // ここで見ているのは Quill の内部クラス名ではなく自分のクラス名。
  .editor-toolbar__wide {
    display: none;
  }
}
</style>
