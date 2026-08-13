<template>
  <div class="month">
    <!--
      狭い画面では月一覧を畳み、いま見ている月だけを出す。トグル自体は常に
      描画しておき、出す/出さないは CSS のメディアクエリに任せる。JS で幅を
      見て分岐すると、リサイズのたびに DOM が入れ替わって面倒なだけなので。
    -->
    <button
        type="button"
        class="month__toggle"
        v-bind:aria-expanded="open"
        aria-controls="month-list-items"
        v-on:click="open = !open">
      <span class="month__toggle-current">{{ currentMonth }}</span>
      <span class="month__toggle-label">{{ open ? '▲ 閉じる' : '▼ 月を選ぶ' }}</span>
    </button>
    <ul
        id="month-list-items"
        class="month__items"
        v-bind:class="{ 'month__items--open': open }">
      <!--
        タイルは <li> の中の <a>。<a> を <ul> の直下に置くと、支援技術には
        「項目のないリスト」に見えてしまう。
      -->
      <li v-for="month in months" :key="month">
        <router-link
            class="month__item"
            v-bind:class="{ 'month__item--active': isActive(month) }"
            v-bind:to="'/' + month"
            v-on:click="onSelect(month, $event)">
          {{ month }}
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

const MonthList = defineComponent({
  data: function () {
    return {
      // 狭い画面で月一覧を開いているか。広い画面では CSS 側が常に開いた形で
      // 描くので、この値は無視される。
      open: false,
    };
  },
  props: {
    months: Array<string>,
  },
  computed: {
    // 畳んでいる間に出す「いま見ている月」。ルートは '/YYYY/MM' なので先頭の
    // '/' を落とすだけでよい(vue-router の path は必ず '/' 始まり)。months に
    // 無い月(未来の月を直接開いた等)でもそのまま出る。
    currentMonth: function (): string {
      return this.$route.path.replace(/^\//, '');
    },
  },
  watch: {
    // 月が変われば畳む。戻る/進むやアドレス直打ちも含めてここで拾える。
    '$route.path': function () {
      this.open = false;
    },
  },
  methods: {
    // いま見ている月かどうか。
    isActive: function (month: string): boolean {
      return month === this.currentMonth;
    },
    // タイルが押されたとき。
    //
    // 基本は「遷移したら畳む」(watch)に任せる。ここで無条件に畳んでしまうと、
    // 遷移が起きなかったときにも畳んでしまう: 未保存の変更があって
    // IndexPage の beforeRouteUpdate の確認ダイアログをキャンセルした場合、
    // 月は変わっていないのに一覧だけ閉じて、トグルには前の月が出たままになる。
    //
    // 例外がひとつだけあって、いま見ている月をもう一度押したときは
    // vue-router が重複ナビゲーションを中断するので watch が発火しない。
    // 「はい、これ」という自然な操作なので、ここで畳む。新しいタブで開く
    // 操作(修飾キー・主ボタン以外)はそもそも今のページを動かさないので除く。
    onSelect: function (month: string, event: MouseEvent): void {
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
        return;
      }
      if (month === this.currentMonth) {
        this.open = false;
      }
    },
  }
});

export default MonthList;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@use '../styles/breakpoints' as bp;

.month {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5em;
  padding-left: 0.5em;
}
ul {
  width: 100%;
  list-style-type: none;
  padding: 0;
  margin: 0;
}
li {
  margin: 0.5em 1em 0.5em 0;
}
// タイルの見た目は <a> 自身に持たせる。押せる範囲と枠が一致する。
.month__item {
  display: block;
  text-align: center;
  padding: 0.1em 0.3em;
  width: 100%;
  box-sizing: border-box;
  border: #2c3e50 solid 1px;
  color: black;
  text-decoration: none;
}
.month__item--active {
  background: #2c3e50;
  color: white;
}

// 広い画面ではトグルは要らない。一覧は常に出ている。
.month__toggle {
  display: none;
}

@media (max-width: bp.$mobile-max) {
  .month {
    // 一覧が縦に伸びてもページ側がスクロールするので、ここでスクロール枠を
    // 作らない。入れ子のスクロール領域はスマホだと拾いづらい。
    overflow: visible;
    padding: 0;
    // 本文をどれだけ下まで読んでも月を移動できるように上に貼り付ける。
    position: sticky;
    top: 0;
    z-index: 10;
    background: white;
  }
  .month__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    width: 100%;
    // 指で押せる高さを確保する。
    min-height: 2.75rem;
    padding: 0.5em 0.8em;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 1rem;
    color: #2c3e50;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .month__toggle-current {
    font-weight: bold;
  }
  .month__toggle-label {
    font-size: 0.8em;
  }
  .month__items {
    display: none;
  }
  .month__items--open {
    // 年単位で増えていくので、縦一列ではなくタイルで並べて一望できるようにする。
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5em, 1fr));
    gap: 0.5em;
    padding: 0 0.8em 0.8em;
    // タイルの左右に padding を付けるので、border-box でないと
    // width:100% + padding で画面からはみ出し、横スクロールが出る。
    box-sizing: border-box;
    // 月が増えても画面を覆い尽くさないよう、ここだけはスクロールさせる。
    // sticky な親が画面より高くなると下端に手が届かなくなるので、ページ側の
    // スクロールには任せられない。iOS の vh はアドレスバー収納時基準なので
    // 可視領域をはみ出す。対応していれば dvh を使う。
    max-height: 60vh;
    max-height: 60dvh;
    overflow-y: auto;
  }
  .month__items--open li {
    margin: 0;
    // 行の高さはタイル(<a>)側で決める。<li> はグリッドのセルとして伸びるので、
    // ここを揃えておかないと隣が2行になったときにタイルがセルを埋めない。
    display: flex;
  }
  .month__items--open .month__item {
    // タイル1枚を指で押せる大きさにする。
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
  }
}
</style>
