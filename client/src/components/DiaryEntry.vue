<template>
  <div class="diary">
    <h2>{{ `0000${diary.year}`.slice(-4) }}/{{ `00${diary.month}`.slice(-2) }}/{{ `00${diary.day}`.slice(-2) }}</h2>
    <DiaryEditor
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
import * as protocol from 'protocol';
import DiaryEditor, {EditorChangeEvent} from '@/components/DiaryEditor.vue'
import dayjs from 'dayjs';

// eslint-disable-next-line
const DiaryEntry = defineComponent({
  components: {
    DiaryEditor,
  },
  props: {
    diary: {
      type: Object,
      required: false,
      default: () => ({} as protocol.Entity.Diary)
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

export default DiaryEntry;
interface DiaryChangeEvent {
  year: number,
  month: number,
  day: number,
  text: string,
}
export { DiaryChangeEvent };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<!-- FIXME: scoped not working well -->
<style lang="scss">
img {
  max-width: 100%;
  height: auto;
}
</style>
