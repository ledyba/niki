<template>
  <div class="diary" v-bind:data-date="date">
    <h2 class="diary__header">
      <span class="diary__date">{{ date }}</span>
      <button
          type="button"
          class="diary__edit-toggle"
          v-bind:aria-pressed="editing"
          v-bind:title="editing ? '編集をやめて表示に戻る' : 'この日の日記を編集する'"
          v-on:click="$emit('toggle-edit', date)">
        {{ editing ? '☑ 完了' : '✎ 編集' }}
      </button>
    </h2>
    <template v-if="editing">
      <DiaryEditor
          v-bind:content="diary.text"
          v-bind:focused="editing"
          v-on:change="onEditorChange($event)"
      />
    </template>
    <!--
      表示側にも Quill と同じクラスを着せる。Quill は箇条書きの階層を <ol> の
      入れ子ではなく <li> の data-list 属性と ql-indent-N クラスで表し、字下げも
      行頭のマーカーも .ql-editor 配下の CSS でしか描かない (マーカーの実体は
      li > .ql-ui::before の content)。素の HTML として出すと階層が消えるうえ、
      中身は常に <ol> なので箇条書きまで「1. 2. 3.」の連番になる。

      入れ子にしてあるのは、引用・コードブロック・見出しの体裁が
      `.ql-snow .ql-editor blockquote` のように「祖先の .ql-snow」を要求するため。
      1枚の div に両方のクラスを付けても子孫セレクタには一致しない。
    -->
    <div v-else-if="diary.text" class="diary__body ql-snow">
      <div class="ql-editor" v-html="diary.text" />
    </div>
    <div v-else class="diary__empty">（まだ書かれていません）</div>
    <SaveStatusIndicator v-if="status" v-bind:status="status" />
  </div>
</template>

<script lang="ts">
// https://qiita.com/simezi9/items/c27d69f17d2d08722b3a
import { defineComponent, type PropType } from 'vue';
import type * as protocol from 'server/protocol';
import DiaryEditor, {type EditorChangeEvent} from '@/components/DiaryEditor.vue'
import SaveStatusIndicator, {type SaveStatus} from '@/components/SaveStatusIndicator.vue'
import { formatDate } from '@/calendar';

const DiaryEntry = defineComponent({
  components: {
    DiaryEditor,
    SaveStatusIndicator,
  },
  // emits を宣言しないと、Vue 3 は同名の v-on をカスタムイベントに加えて
  // ルート要素へのネイティブ DOM リスナとしても付ける。DiaryEditor 内の
  // Quill ツールバーが持つ <input type="file"> 等の change がバブリングして
  // 拾われ、onEditorChange に Event が渡ってしまう事故を防ぐ。
  emits: ['change', 'toggle-edit'],
  props: {
    diary: {
      type: Object,
      required: false,
      default: () => ({} as protocol.Entity.Diary)
    },
    // 今日かどうかでは分岐しない。どの日も同じように編集できる。
    editing: {
      type: Boolean,
      required: false,
      default: false,
    },
    // 日付('YYYY/MM/DD')ごとの保存状態。自分の日のエントリがあれば
    // それを出す。
    statuses: {
      type: Object as PropType<Map<string, SaveStatus>>,
      required: false,
      default: (): Map<string, SaveStatus> => new Map(),
    },
  },
  data: function () {
    return {
    }
  },
  computed: {
    date: function (): string {
      return formatDate(this.diary.year, this.diary.month, this.diary.day);
    },
    status: function (): SaveStatus | null {
      const own = this.statuses.get(this.date);
      if (own !== undefined) {
        // 自分の保存状況を出す。
        return own;
      }
      // 編集中は場所を確保しておく(indicator が出たり消えたりでガタつかないように)。
      return this.editing ? { kind: 'idle', message: '' } : null;
    },
  },
  methods: {
    onEditorChange: function (change: EditorChangeEvent) {
      this.$emit('change', {
        year: this.diary.year,
        month: this.diary.month,
        day: this.diary.day,
        text: change.html,
      } as DiaryChangeEvent);
    }
  }
});

export default DiaryEntry;
interface DiaryChangeEvent {
  year: number,
  month: number,
  day: number,
  text: string,
}
export type { DiaryChangeEvent };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<!-- FIXME: scoped not working well -->
<style lang="scss">
@use '../styles/breakpoints' as bp;

img {
  max-width: 100%;
  height: auto;
}

.diary__body {
  // 長い URL は折り返す。
  overflow-wrap: break-word;
}

// ql-editor はエディタの「枠」の分の指定も持っている。表示側では要らないので
// 打ち消す。詳細度を .diary__body > .ql-editor で上げてあるのは、quill.core.css の
// .ql-editor と同点にして出力順に賭けないため (CSS の import 位置を動かしただけで
// 黙って戻る、という壊れ方をする)。
.diary__body > .ql-editor {
  height: auto;
  padding: 0;
  // 縦のスクロール枠は .diary-list 側が持つ。ここで auto にすると、
  // 日ごとに独立したスクロール枠ができてしまう。
  overflow-y: visible;
  // 入力欄ではないので、文字カーソルは出さない (.ql-editor > * の打ち消し)。
  > * {
    cursor: auto;
  }
}

.diary__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5em;
}

.diary__edit-toggle {
  flex: 0 0 auto;
  font-size: 0.6em;
  font-family: inherit;
  color: #2c3e50;
  background: transparent;
  border: #2c3e50 solid 1px;
  border-radius: 0.2em;
  padding: 0.2em 0.6em;
  cursor: pointer;
}

.diary__edit-toggle:hover {
  background: #eceff1;
}

.diary__edit-toggle[aria-pressed="true"] {
  color: white;
  background: #2c3e50;
}

.diary__empty {
  color: #9e9e9e;
  font-size: 0.9em;
}

@media (max-width: bp.$mobile-max) {
  .diary__header {
    // 見出しが大きいままだと日付とボタンで1行を使い切ってしまう。
    font-size: 1.2em;
    // 44px のボタンをベースライン揃えのままにすると、日付の文字の下に
    // ぶら下がって行が伸びる。狭い画面では上下中央で揃える。
    align-items: center;
  }
  .diary__body {
    // 折り返せないもの(貼り付けた表や幅広の <pre>)は、ページごと横に広げず
    // 本文の中だけで横スクロールさせる。月一覧の sticky は縦方向にしか
    // 効かないので、ページが横に流れると操作系ごと画面外へ出てしまう。
    // (縦は overflow が auto に計算されるが、高さは内容なりなので実際には
    // スクロールしない。デスクトップでは .diary-list 側が横をクリップする
    // ので、ここは狭い画面だけでよい。)
    overflow-x: auto;
  }
  .diary__edit-toggle {
    // 0.6em (h2 基準で約14px、押せる高さは20px強) では指で狙えない。
    // 44px まで広げる。em は h2 の font-size に乗るので、狙った値をそのまま
    // 書ける rem を使う (月一覧のタイルとも揃う)。
    font-size: 0.9rem;
    padding: 0.5em 1em;
    min-height: 2.75rem;
  }
}
</style>
