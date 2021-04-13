<template>
  <div class="diary-list">
    <div class="diary" v-for="diary in diaries" :key="diary.year + '/' + diary.month + '/' + diary.day">
      <Diary v-bind:diary="diary"></Diary>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Diary from '@/components/Diary.vue'
import * as bridge from "bridge";

const DiaryList = defineComponent({
  components: {
    Diary,
  },
  data() {
    return {
    };
  },
  props: {
    diaries: {
      type: Array,
      required: false,
      default: () => ([] as Array<bridge.Entity.Diary>)
    },
  },
  methods: {
  }
});

export default DiaryList;
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
