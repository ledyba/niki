<template>
  <div class="home">
    <MonthList v-bind:months="resp.months" />
  </div>
</template>

<script lang="ts">
import MonthList from "@/components/MonthList.vue";
import * as bridge from 'bridge'
import {defineComponent} from "vue";

async function callHome(): Promise<bridge.Index.Response> {
  const raw = await fetch('/api/index')
  const json = await raw.json()
  return json as bridge.Index.Response;
}

const Home = defineComponent({
  components: {
    MonthList,
  },
  data() {
    return {
      resp: {} as bridge.Index.Response,
    };
  },
  created() {
    callHome()
        .then((resp) => {
          this.resp = resp;
        });
  },
})
export default Home;
</script>
