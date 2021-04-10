<template>
  <div class="month">
    {{ `0000${year}`.slice(-4) }}/{{ `00${month}`.slice(-2) }}/ {{ asy }}
  </div>
</template>

<script lang="ts">
import {defineComponent} from "vue";

const MonthEntry = defineComponent({
  data() {
    return {
      asy: "1"
    };
  },
  props: {
    year: Number,
    month: Number,
  },
  methods: {

  }
});

export default MonthEntry;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
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
