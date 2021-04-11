<template>
  <div class="month">
    <ul>
      <router-link v-for="month in months" :key="month" v-bind:to="'/' + month">
      <li>
        {{ month }}
      </li>
      </router-link>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

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
.month {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5em;
}
ul {
  width: 100%;
  list-style-type: none;
  padding: 0;
  margin: 0;
}
li {
  text-align: center;
  display: block;
  margin: 0.5em 1em 0.5em 0;
  padding: 0.1em 0.3em;
  background: #168867;
  width: 100%;
  box-sizing: border-box;
}
a {
  color: #ffffff;
  text-decoration: none;
}
</style>
