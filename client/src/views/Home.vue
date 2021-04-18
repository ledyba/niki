<template>
  <div class="home">
    <MonthList class="month-list" v-bind:months="resp.months"/>
    <DiaryList class="texts" v-bind:diaries="resp.diaries" v-on:diary-change="onDiaryChange($event)">texts</DiaryList>
  </div>
</template>

<script lang="ts">
import MonthList from "@/components/MonthList.vue";
import DiaryList from '@/components/DiaryList.vue'
import * as bridge from 'bridge'
import { defineComponent } from "vue";
import {DiaryChangeEvent} from "@/components/Diary.vue";

async function callHome(): Promise<bridge.Index.Response> {
  const raw = await fetch('/api/index')
  const json = await raw.json()
  return json as bridge.Index.Response;
}

const Home = defineComponent({
  components: {
    MonthList,
    DiaryList,
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
  methods: {
    onDiaryChange: function (event: DiaryChangeEvent) {
      console.log(event);
    }
  }
})
export default Home;

</script>
<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.home > .month-list {
  flex-basis: auto;
  flex-grow: 0;
  border-right: #2c3e50 1px solid;
}
.home > .texts {
  flex-grow: 1;
}
</style>
