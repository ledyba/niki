<template>
  <div class="diary">
    <div>{{ `0000${text.year}`.slice(-4) }}/{{ `00${text.month}`.slice(-2) }}/{{ `00${text.day}`.slice(-2) }}</div>
    <HTMLEditor v-bind:content="text.text" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import HTMLEditor from '@/components/HTMLEditor.vue';

const Diary = defineComponent({
  components: {
    HTMLEditor,
  },
  data() {
    return {
    };
  },
  props: {
    text: Object,
  },
  methods: {
  }
});

export default Diary;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.month {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5em;
}
a {
  color: #ffffff;
  text-decoration: none;
}
</style>
