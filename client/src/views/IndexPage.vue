<template>
  <div class="home">
    <MonthList class="month-list" v-bind:months="months"/>
    <DiaryList class="texts" v-bind:diaries="diaries" v-bind:save-status="saveStatus" v-on:diary-change="onDiaryChange($event)" />
  </div>
</template> 

<script lang="ts">
import MonthList from '@/components/MonthList.vue';
import DiaryList from '@/components/DiaryList.vue'
import {DiaryChangeEvent} from '@/components/DiaryEntry.vue';
import {SaveStatus} from '@/components/SaveStatusIndicator.vue';
import * as protocol from 'server/protocol';
import { defineComponent } from 'vue';
import dayjs from 'dayjs';

const UNSAVED_WARNING = '保存されていない変更、または保存に失敗した変更があります。このページを離れてもよろしいですか？';

function parseIntArg(str: string): number | null {
  const parsed = parseInt(str, 10);
  if(isNaN(parsed)) {
    return null;
  }
  return parsed;
}

async function fetchDiaries(year: number, month: number): Promise<protocol.Diaries.Response> {
  const raw = await fetch(`/diaries/${('0000'+year).slice(-4)}/${('00'+month).slice(-2)}`);
  const json = await raw.json();
  return json as protocol.Diaries.Response;
}

async function updateDiary(year: number, month: number, day: number, text: string): Promise<protocol.UpdateDiary.Response> {
  const param = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    // リクエストボディ
    body: JSON.stringify({
      text: text,
    } as protocol.UpdateDiary.RequestBody)
  };
  const raw = await fetch(`/diaries/${('0000'+year).slice(-4)}/${('00'+month).slice(-2)}/${('00'+day).slice(-2)}`, param);
  if (!raw.ok) {
    let message = `${raw.status} ${raw.statusText}`.trim();
    try {
      const body = (await raw.text()).trim();
      if (body) {
        message = body;
      }
    } catch {
      // レスポンスボディが読めないときはステータス文言のまま
    }
    throw new Error(message);
  }
  const json = await raw.json();
  return json as protocol.UpdateDiary.Response;
}

const IndexPage = defineComponent({
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
      diaries: Array<protocol.Entity.Diary>(),
      updateTicket: null as number | null,
      // 保存ごとに単調増加させる世代カウンタ。fetch解決時に最新世代か判定する。
      saveSeq: 0,
      // 最後の保存成功以降に編集があったか。
      dirty: false,
      saveStatus: { kind: 'idle', message: '' } as SaveStatus,
      saveHandler_: this.saveHandler.bind(this),
      beforeUnloadHandler_: this.beforeUnloadHandler.bind(this),
    };
  },
  beforeMount: function() {
    window.addEventListener('keydown', this.saveHandler_);
    window.addEventListener('beforeunload', this.beforeUnloadHandler_);
    this.updateDiaries();
  },
  beforeUnmount: function() {
    window.removeEventListener('keydown', this.saveHandler_);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler_);
  },
  beforeRouteLeave: function() {
    if (this.hasUnsavedRisk() && !window.confirm(UNSAVED_WARNING)) {
      return false;
    }
    return true;
  },
  beforeRouteUpdate: function(route) {
    if (this.hasUnsavedRisk() && !window.confirm(UNSAVED_WARNING)) {
      return false;
    }
    this.resetSaveState();
    this.year = parseIntArg(route.params.year as string) || dayjs().year();
    this.month = parseIntArg(route.params.month as string) || dayjs().month() + 1;
    this.updateDiaries();
    return true;
  },
  methods: {
    saveHandler: function (event: KeyboardEvent) {
      if (!(event.key.toLowerCase() == 's' && event.ctrlKey)) return true;
      event.preventDefault();
      return false;
    },
    updateDiaries: function () {
      fetchDiaries(this.year, this.month)
          .then((resp) => {
            const now = dayjs();
            const months = resp.months;
            const currentMonth = `${('0000'+now.year()).slice(-4)}/${('00'+(now.month() + 1)).slice(-2)}`;
            if(months.length <= 0 || months[0] !== currentMonth) {
              months.unshift(currentMonth);
            }
            this.months = months;
            const diaries = resp.diaries;
            let alreadyPosted = false;
            if(diaries.length > 0) {
              const first = diaries[0];
              alreadyPosted = first.year === now.year() && first.month === now.month() + 1 && first.day === now.date();
            }
            if(!alreadyPosted && this.year === now.year() && this.month === now.month()+1) {
              const diary: protocol.Entity.Diary = {
                year: now.year(),
                month: now.month() + 1,
                day: now.date(),
                text: '',
              };
              diaries.unshift(diary);
            }
            this.diaries = diaries;
          })
          .catch((err) => console.error("Failed to load diaries", err));
    },
    hasUnsavedRisk: function (): boolean {
      // dirty(未保存の編集あり) か error(保存失敗) のとき離脱をガードする。
      return this.dirty || this.saveStatus.kind === 'error';
    },
    beforeUnloadHandler: function (event: BeforeUnloadEvent) {
      if (this.hasUnsavedRisk()) {
        event.preventDefault();
        // 一部ブラウザでは returnValue の設定が必要。
        event.returnValue = '';
      }
    },
    resetSaveState: function () {
      // 月の切り替えなどで保存文脈を破棄する。in-flightな保存が
      // 新しい月の状態を書き換えないよう seq も進める。
      if (this.updateTicket !== null) {
        clearTimeout(this.updateTicket);
        this.updateTicket = null;
      }
      this.saveSeq += 1;
      this.dirty = false;
      this.saveStatus = { kind: 'idle', message: '' };
    },
    onDiaryChange: function (event: DiaryChangeEvent) {
      // 編集が入った → dirty。デバウンス待機中/dirty のあいだは idle(空欄)。
      this.dirty = true;
      this.saveStatus = { kind: 'idle', message: '' };
      if(this.updateTicket !== null) {
        clearTimeout(this.updateTicket);
        this.updateTicket = null;
      }
      this.updateTicket = setTimeout(()=> {
        this.updateTicket = null;
        // この保存の世代を確定。以降 dirty=false（この時点の内容を保存中）。
        const seq = this.saveSeq + 1;
        this.saveSeq = seq;
        this.dirty = false;
        this.saveStatus = { kind: 'saving', message: '' };
        updateDiary(event.year, event.month, event.day, event.text)
            .then((resp) => {
              if(seq !== this.saveSeq) {
                // 自分より新しい保存が始まっている/文脈が破棄された → 無視。
                return;
              }
              if(resp.months) {
                this.months = resp.months;
              }
              if(this.dirty) {
                // 保存中にさらに編集された → ☑は出さず idle に戻す
                // （後続のデバウンス保存が改めて走る）。
                this.saveStatus = { kind: 'idle', message: '' };
              } else {
                this.saveStatus = { kind: 'saved', message: '' };
              }
            })
            .catch((err) => {
              if(seq !== this.saveSeq) {
                return;
              }
              const message = err instanceof Error ? err.message : String(err);
              this.saveStatus = { kind: 'error', message: message };
            });
      }, 200);
    }
  }
})
export default IndexPage;
</script>
<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 60em;
  max-width: 100%;
  height: 100%;
  box-sizing: border-box;
  margin-left: auto;
  margin-right: auto;
  border-left: #2c3e50 1px solid;
  border-right: #2c3e50 1px solid;
}

.home > .month-list {
  flex-basis: auto;
  flex-grow: 0;
  flex-shrink: 0;
  border-right: #2c3e50 1px solid;
}
.home > .texts {
  flex-grow: 1;
}
</style>
