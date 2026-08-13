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
        畳むのは「押されたら」であって「ルートが変わったら」ではない。いま見ている
        月のタイルを押した場合、vue-router は重複ナビゲーションを中断して path が
        変わらないので、ルートの変化だけを見ていると開きっぱなしになる。
      -->
      <router-link
          v-for="month in months"
          :key="month"
          v-bind:to="'/' + month"
          v-on:click="open = false">
      <li v-bind:class="{ 'month__item--active': isActive(month) }">
        {{ month }}
      </li>
      </router-link>
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
    // 押されたときに畳むのが本筋(テンプレートの注記参照)だが、戻る/進むや
    // アドレス直打ちで月が変わることもあるので、ここでも畳んでおく。
    '$route.path': function () {
      this.open = false;
    },
  },
  methods: {
    // いま見ている月かどうか。
    isActive: function (month: string): boolean {
      return month === this.currentMonth;
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
  // 狭い画面ではタイルの周りに padding を付ける。border-box にしておかないと
  // width:100% + padding で画面からはみ出し、横スクロールが出る。
  box-sizing: border-box;
}
li {
  text-align: center;
  display: block;
  margin: 0.5em 1em 0.5em 0;
  padding: 0.1em 0.3em;
  width: 100%;
  box-sizing: border-box;
  border: #2c3e50 solid 1px;
}
a {
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
    // タイル1枚を指で押せる大きさにする。
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
  }
}
</style>
