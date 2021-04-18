<template>
  <div class="home">
    <MonthList class="month-list" v-bind:months="months"/>
    <DiaryList class="texts" v-bind:diaries="diaries" v-on:diary-change="onDiaryChange($event)">texts</DiaryList>
  </div>
</template>

<script lang="ts">
import MonthList from "@/components/MonthList.vue";
import DiaryList from '@/components/DiaryList.vue'
import * as bridge from 'bridge'
import { defineComponent } from "vue";
import {DiaryChangeEvent} from "@/components/Diary.vue";
import dayjs from "dayjs";

function parseIntArg(str: string): number | null {
  const parsed = parseInt(str, 10);
  if(isNaN(parsed)) {
    return null;
  }
  return parsed;
}

async function fetchDiaries(year: number, month: number): Promise<bridge.Diaries.Response> {
  const raw = await fetch(`/diaries/${year}/${month}`);
  const json = await raw.json();
  return json as bridge.Diaries.Response;
}

async function updateDiary(year: number, month: number, day: number, text: string): Promise<bridge.UpdateDiary.Response> {
  const param  = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    // リクエストボディ
    body: JSON.stringify({
      text: text,
    } as bridge.UpdateDiary.RequestBody)
  };
  const raw = await fetch(`/diaries/${year}/${month}/${day}`, param);
  const json = await raw.json();
  return json as bridge.Diaries.Response;
}

const Index = defineComponent({
  components: {
    MonthList,
    DiaryList,
  },
  data: function() {
    const year: number = parseIntArg(this.$route.params.year as string) || dayjs().year();
    const month: number = parseIntArg(this.$route.params.month as string) || dayjs().month() + 1;
    return {
      year: year,
      month: month,
      months: Array<string>(),
      diaries: Array<bridge.Entity.Diary>(),
    };
  },
  created: function() {
    fetchDiaries(this.year, this.month)
        .then((resp) => {
          this.months = resp.months;
          this.diaries = resp.diaries;
        });
  },
  methods: {
    onDiaryChange: function (event: DiaryChangeEvent) {
      updateDiary(event.year, event.month, event.day, event.text)
      .then((resp) => {
        this.months = resp.months;
      });
    }
  }
})
export default Index;

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
