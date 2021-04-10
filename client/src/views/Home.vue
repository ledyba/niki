<template>
  <div class="home">
    <MonthEntry year="2021" month="20" />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import HelloWorld from '@/components/HelloWorld.vue'; // @ is an alias to /src
import MonthEntry from "@/components/MonthEntry.vue";

@Options({
  components: {
    MonthEntry,
  },
})
export default class Home extends Vue {}
</script>
