<template>
  <div class="diary">
    <h2>{{ `0000${diary.year}`.slice(-4) }}/{{ `00${diary.month}`.slice(-2) }}/{{ `00${diary.day}`.slice(-2) }}</h2>
    <Editor
        ref="quillEditor"
        v-if="isToday"
        v-bind:content="diary.text"
        v-bind:focused="isToday"
        v-on:change="onEditorChange($event)"
    />
    <div v-else
        v-html="diary.text"
        v-bind:focused="isToday"
    />
  </div>
</template>

<script lang="ts">
// https://qiita.com/simezi9/items/c27d69f17d2d08722b3a
import { defineComponent } from 'vue';
import * as bridge from 'bridge';
import Editor, {EditorChangeEvent} from '@/components/Editor.vue'
import dayjs from "dayjs";

const Diary = defineComponent({
  components: {
    Editor,
  },
  props: {
    diary: {
      type: Object,
      required: false,
      default: () => ({} as bridge.Entity.Diary)
    },
  },
  data: function () {
    return {
    }
  },
  computed: {
    isToday: function (): boolean {
      const now = dayjs();
      return now.year() === this.diary.year && (now.month() + 1) === this.diary.month && now.date() === this.diary.day;
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

export default Diary;
export interface DiaryChangeEvent {
  year: number,
  month: number,
  day: number,
  text: string,
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
a {
  color: #ffffff;
  text-decoration: none;
}
</style>
