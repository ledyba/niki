<template>
  <div class="home">
    <MonthList class="month-list" v-bind:months="months"/>
    <DiaryList
        class="texts"
        v-bind:diaries="diaries"
        v-bind:statuses="statuses"
        v-bind:editing-date="editingDate"
        v-on:diary-change="onDiaryChange($event)"
        v-on:toggle-edit="onToggleEdit($event)" />
  </div>
</template>

<script lang="ts">
import MonthList from '@/components/MonthList.vue';
import DiaryList from '@/components/DiaryList.vue'
import type {DiaryChangeEvent} from '@/components/DiaryEntry.vue';
import type {SaveStatus} from '@/components/SaveStatusIndicator.vue';
import type * as protocol from 'server/protocol';
import { defineComponent } from 'vue';
import dayjs from 'dayjs';
import { formatMonth, formatDate, todayDate, buildMonths, buildDiaries } from '@/calendar';

const UNSAVED_WARNING = '保存されていない変更、または保存に失敗した変更があります。このページを離れてもよろしいですか？';

function parseIntArg(str: string): number | null {
  const parsed = parseInt(str, 10);
  if(isNaN(parsed)) {
    return null;
  }
  return parsed;
}

async function fetchDiaries(year: number, month: number): Promise<protocol.Diaries.Response> {
  const raw = await fetch(`/diaries/${formatMonth(year, month)}`);
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
  const raw = await fetch(`/diaries/${formatDate(year, month, day)}`, param);
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
      // 編集中の日('YYYY/MM/DD')。一度に開くエディタは高々1つ。
      // 今日は最初から編集モードで開く。
      editingDate: todayDate() as string | null,
      updateTicket: null as number | null,
      // 保存を直列化する: 常に高々1本だけ in-flight にする。
      saving: false,
      // in-flight 中に入った編集を日付ごとに保持するキュー(同じ日は最新で上書き)。
      // 日付をまたいで編集できるので、単一スロットだと別の日の編集で潰れてしまう。
      pending: new Map<string, DiaryChangeEvent>(),
      // 月切替などで文脈を破棄する世代カウンタ。in-flight の解決時に
      // まだ同じ文脈(=同じ月)かを判定し、古い解決を無視するために使う。
      saveSeq: 0,
      // flushSave が一度失敗した日。次のユーザー編集で pending に入り直し、
      // このセットから外れるまでは nextJob() の候補から除外する
      // (無限リトライ防止。同じ日を回し続けて他の日の保存を止めないため)。
      failedDates: new Set<string>(),
      // 日付('YYYY/MM/DD')ごとの保存状態。ここを日ごとに持つことで、
      // A日の保存失敗中にB日の保存が成功しても、Aのエラー表示が
      // 消えたり上書きされたりしない。
      statuses: new Map<string, SaveStatus>(),
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
    // 今月に戻れば今日が開き、それ以外の月に移れば何も開かない、というのが
    // 「初期値が今日」だけで自然に成り立つ。テンプレート側に分岐は要らない。
    this.editingDate = todayDate();
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
      // 現在の文脈(月)を記録。回線が遅いと 3月→4月 と移った際に 3月の応答が
      // 後に解決しうる。そのまま格納すると 3月のエントリが year/month を
      // 保ったまま 4月のページに並び、その行を編集すると 3月へ POST してしまう。
      const seq = this.saveSeq;
      fetchDiaries(this.year, this.month)
          .then((resp) => {
            if(seq !== this.saveSeq) {
              // 文脈が破棄された(月切替) → 古い月の応答は捨てる。
              return;
            }
            this.months = buildMonths(resp.months);
            this.diaries = buildDiaries(this.year, this.month, resp.diaries);
          })
          .catch((err) => console.error("Failed to load diaries", err));
    },
    hasUnsavedRisk: function (): boolean {
      // in-flight中、またはキューに保存待ちの日が残っているなら離脱をガードする。
      // 失敗したジョブは必ず pending に戻しているので、error の判定も
      // pending.size > 0 に含まれる。
      return this.saving || this.pending.size > 0;
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
      // 新しい月の状態を書き換えないよう seq を進め、キューも捨てる。
      if (this.updateTicket !== null) {
        clearTimeout(this.updateTicket);
        this.updateTicket = null;
      }
      this.saveSeq += 1;
      this.saving = false;
      this.pending = new Map<string, DiaryChangeEvent>();
      this.failedDates = new Set<string>();
      this.statuses = new Map<string, SaveStatus>();
    },
    onToggleEdit: function (date: string) {
      // 開いているエディタは常に高々1つ。別の日を開けば前の日は閉じる。
      this.editingDate = (this.editingDate === date) ? null : date;
    },
    onDiaryChange: function (event: DiaryChangeEvent) {
      // 表示用の本文も即座に差し替える。保存を待たずにエディタを閉じても
      // 編集後の HTML が見えるようにするため。
      const target = this.diaries.find((it) => it.year === event.year && it.month === event.month && it.day === event.day);
      if (target !== undefined) {
        target.text = event.text;
      }
      // 最新テキストを日付ごとのキューに上書き保持。新しい打鍵が入った以上、
      // 直前の失敗はもう関係ない → failedDates から外して通常経路に戻す。
      const key = formatDate(event.year, event.month, event.day);
      this.failedDates.delete(key);
      this.pending.set(key, event);
      if (this.saving) {
        // in-flight 中: スピナー(保存中)は途切れさせず維持し、
        // 新しいデバウンスも張らない。完了時に pending を処理する。
        // ただし別の日の「☑ 保存しました」は、その日に新しい編集が入った以上
        // もう正しくないので消す(in-flight の日は 'saving' なので影響しない)。
        // 'error' は消さない。まだ再送していない以上「失敗した」は今も事実なので。
        if (this.statuses.get(key)?.kind === 'saved') {
          this.statuses.set(key, { kind: 'idle', message: '' });
        }
        return;
      }
      // in-flight でない通常の編集: idle(空欄) 表示 + 200ms デバウンス。
      this.statuses.set(key, { kind: 'idle', message: '' });
      if(this.updateTicket !== null) {
        clearTimeout(this.updateTicket);
        this.updateTicket = null;
      }
      this.updateTicket = setTimeout(()=> {
        this.updateTicket = null;
        this.flushSave();
      }, 200);
    },
    // pending の中で failedDates に入っていない最初のジョブを返す(無ければ null)。
    // 失敗した日を選び続けると、他の日の編集がいつまでも保存されなくなるため。
    nextJob: function (): [string, DiaryChangeEvent] | null {
      for (const entry of this.pending) {
        const [key] = entry;
        if (!this.failedDates.has(key)) {
          return entry;
        }
      }
      return null;
    },
    // キューに保存待ちがあれば、直列に(高々1本ずつ)保存を実行する。
    // 成功して他の保存待ちが残っていればデバウンスを待たず即座に次を投げ、
    // スピナーを継続させる。失敗時はその日を failedDates に入れて棚上げし、
    // 他の日があれば続けて処理する(無限リトライにはならない)。
    flushSave: function () {
      const next = this.nextJob();
      if (next === null) {
        return;
      }
      const [key, job] = next;
      this.pending.delete(key);
      // 現在の文脈(月)を記録。解決時に月が切り替わっていたら無視する。
      const seq = this.saveSeq;
      this.saving = true;
      this.statuses.set(key, { kind: 'saving', message: '' });
      updateDiary(job.year, job.month, job.day, job.text)
          .then((resp) => {
            if(seq !== this.saveSeq) {
              // 文脈が破棄された(月切替) → saving 等は触らず無視。
              return;
            }
            if(resp.months) {
              this.months = buildMonths(resp.months);
            }
            this.failedDates.delete(key);
            this.statuses.set(key, { kind: 'saved', message: '' });
            if(this.nextJob() !== null) {
              // 他に保存待ちの日があった → デバウンスを待たず即次を保存。
              // saving は継続し、スピナーを途切れさせない。
              this.flushSave();
            } else {
              this.saving = false;
            }
          })
          .catch((err) => {
            if(seq !== this.saveSeq) {
              return;
            }
            this.saving = false;
            // 失敗した編集は破棄せず「未保存」として残す。自動リトライは
            // せず(無限ループ回避)、次のユーザー編集で通常経路から再送する。
            // より新しい編集が同じ日に入っていたらそちらを優先する: in-flight
            // 中に入った新しい編集はまだ一度も送信していないので、
            // failedDates に入れて棚上げしてはいけない(送られないまま
            // 止まってしまう)。job(今回失敗した古い方)を戻すときだけ
            // failedDates に入れる。それも失敗すればこの catch を再び通り、
            // 今度は pending.has(key) が false なので改めて failedDates に
            // 入って止まる(無限ループにはならない)。
            if(!this.pending.has(key)) {
              this.pending.set(key, job);
              this.failedDates.add(key);
            }
            const message = err instanceof Error ? err.message : String(err);
            this.statuses.set(key, { kind: 'error', message: message });
            // 失敗した日は failedDates に入っているので選ばれない。
            // 他の日の保存待ちがあれば続けて処理する。
            this.flushSave();
          });
    }
  }
})
export default IndexPage;
</script>
<style scoped lang="scss">
@use '../styles/breakpoints' as bp;

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

@media (max-width: bp.$mobile-max) {
  .home {
    // 横並びをやめて縦に積む。月一覧が横幅を取り続けると本文が潰れるので、
    // 上に畳んだ月一覧、下に本文、という順にする。
    flex-direction: column;
    // 高さを 100% に固定すると、中の月一覧と本文がそれぞれ独立したスクロール枠に
    // なる。スマホだとアドレスバーの伸縮や慣性スクロールと噛み合わないので、
    // ページ全体を普通にスクロールさせる。
    height: auto;
    min-height: 100%;
    // 画面幅いっぱいに使うので左右の枠線は引かない。
    border-left: none;
    border-right: none;
  }
  .home > .month-list {
    border-right: none;
    border-bottom: #2c3e50 1px solid;
  }
}
</style>
