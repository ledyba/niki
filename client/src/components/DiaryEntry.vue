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
          ref="quillEditor"
          v-bind:key="editorKey"
          v-bind:content="diary.text"
          v-bind:focused="editing"
          v-on:change="onEditorChange($event)"
      />
    </template>
    <div v-else-if="diary.text" class="diary__body" v-html="diary.text" />
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
import { isMobile } from '@/media';

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
    // Quill はツールバーの構成を生成時にしか受け取らない (DiaryEditor の
    // toolbarConfig の注記参照)。端末の回転などで画面幅が境界をまたいだら、
    // key を変えてエディタごと作り直す。本文は親 (IndexPage) が編集のたびに
    // 持ち直しているので、作り直しても失われない。
    editorKey: function (): string {
      return isMobile.value ? 'narrow' : 'wide';
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
  }
  .diary__edit-toggle {
    // 0.6em (h2 基準で約14px、押せる高さは20px強) では指で狙えない。
    // 44px 相当まで広げる。
    font-size: 0.8em;
    padding: 0.5em 1em;
    min-height: 2.75em;
  }
  // 貼り付けた表や長い URL で本文が横に飛び出さないようにする。
  .ql-editor, .diary__body {
    overflow-wrap: break-word;
  }
}
</style>
