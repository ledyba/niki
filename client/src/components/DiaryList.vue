<template>
  <div class="diary-list">
    <div class="diary" v-for="text in texts" :key="text.year + '/' + text.month + '/' + text.day">
      <Diary v-bind:diary="text"></Diary>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Diary from '@/components/Diary.vue'

const DiaryList = defineComponent({
  components: {
    Diary,
  },
  data() {
    return {
    };
  },
  props: {
    texts: Array,
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
