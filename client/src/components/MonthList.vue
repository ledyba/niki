<template>
  <div class="month">
    <li v-for="month in months" :key="month">
      {{ month }}
    </li>
  </div>
</template>

<script lang="ts">
import {defineComponent} from "vue";

const MonthList = defineComponent({
  data() {
    return {
    };
  },
  props: {
    months: Array,
  },
  methods: {
  }
});

export default MonthList;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
