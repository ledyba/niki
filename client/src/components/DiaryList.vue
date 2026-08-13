<template>
  <div class="diary-list">
    <div class="diary" v-for="diary in diaries" :key="diary.year + '/' + diary.month + '/' + diary.day">
      <DiaryEntry
        v-bind:diary="diary"
        v-bind:editing="isEditing(diary)"
        v-bind:statuses="statuses"
        v-on:change="onDiaryChange($event)"
        v-on:toggle-edit="onToggleEdit($event)">
      </DiaryEntry>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DiaryEntry, {type DiaryChangeEvent} from '@/components/DiaryEntry.vue'
import type {SaveStatus} from '@/components/SaveStatusIndicator.vue'
import type * as protocol from 'server/protocol';
import { formatDate } from '@/calendar';

const DiaryList = defineComponent({
  components: {
    DiaryEntry,
  },
  // emits を宣言しないと、Vue 3 は同名の v-on をカスタムイベントに加えて
  // ルート要素へのネイティブ DOM リスナとしても付ける(DiaryEntry 側の注記参照)。
  emits: ['diary-change', 'toggle-edit'],
  data: function() {
    return {
    };
  },
  props: {
    diaries: {
      type: Array<protocol.Entity.Diary>,
      required: false,
      default: () => { return ([] as Array<protocol.Entity.Diary>); },
    },
    // 編集中の日('YYYY/MM/DD')。null なら全て表示モード。
    editingDate: {
      type: String as PropType<string | null>,
      required: false,
      default: null,
    },
    // 日付('YYYY/MM/DD')ごとの保存状態。DiaryEntry がこれで自分の
    // インジケータを出すかどうか・何を出すかを決める。
    statuses: {
      type: Object as PropType<Map<string, SaveStatus>>,
      required: false,
      default: (): Map<string, SaveStatus> => new Map(),
    },
  },
  methods: {
    isEditing: function (diary: protocol.Entity.Diary): boolean {
      // formatDate は必ず文字列を返すので、editingDate が null のときは
      // この比較だけで自然に false になる。
      return this.editingDate === formatDate(diary.year, diary.month, diary.day);
    },
    onDiaryChange: function (event: DiaryChangeEvent) {
      this.$emit('diary-change', event)
    },
    onToggleEdit: function (date: string) {
      this.$emit('toggle-edit', date)
    },
  }
});

export default DiaryList;
export type { DiaryChangeEvent };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@use '../styles/breakpoints' as bp;

.diary-list {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1em;
}
.diary:not(:last-child) {
  margin-bottom: 1em;
}

@media (max-width: bp.$mobile-max) {
  .diary-list {
    // IndexPage 側で高さの固定をやめている(ページ全体がスクロールする)ので、
    // 縦のスクロール枠は作らない。
    //
    // 横は塞いだままにする。visible にすると overflow-x: hidden まで一緒に
    // 落ちてしまい、何かがはみ出したときページごと横に流れる。月一覧の
    // sticky は縦にしか効かないので、そうなると月トグルと編集ボタンが
    // 画面の外へ出ていく。hidden ではなく clip なのは、hidden だと縦も
    // auto に計算されてスクロール枠に戻ってしまうため。
    overflow-y: visible;
    overflow-x: clip;
    // 狭い画面では余白より本文の幅を優先する。
    padding: 0.8em 0.6em;
  }
}
</style>
