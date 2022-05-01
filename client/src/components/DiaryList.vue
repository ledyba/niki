<template>
  <div class="diary-list">
    <div class="diary" v-for="diary in diaries" :key="diary.year + '/' + diary.month + '/' + diary.day">
      <DiaryEntry
        v-bind:diary="diary"
        v-on:change="onDiaryChange($event)">
      </DiaryEntry>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import DiaryEntry, {DiaryChangeEvent} from '@/components/DiaryEntry.vue'
import * as protocol from 'protocol';

const DiaryList = defineComponent({
  components: {
    DiaryEntry,
  },
  data: function() {
    return {
    };
  },
  props: {
    diaries: {
      type: Array,
      required: false,
      default: () => { return ([] as Array<protocol.Entity.Diary>); },
    },
  },
  methods: {
    onDiaryChange: function (event: DiaryChangeEvent) {
      this.$emit('diary-change', event)
    },
  }
});

export default DiaryList;
export { DiaryChangeEvent };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.diary-list {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1em;
}
.diary:not(:last-child) {
  margin-bottom: 1em;
}
</style>
