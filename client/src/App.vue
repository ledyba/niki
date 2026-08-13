<template>
  <router-view/>
</template>

<script lang="ts">
import {defineComponent} from "vue";

const App = defineComponent({
  components: {
  },
  data: function () {
    return {};
  },
  props: {}
});
export default App;
</script>

<style lang="scss">
@use './styles/breakpoints' as bp;

// 元は index.html の style 属性に書いていたもの。メディアクエリで上書きしたいので
// こちらへ移した。
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

body {
  padding: 0.5em;
}

@media (max-width: bp.$mobile-max) {
  body {
    // 狭い画面では余白より本文の幅を優先する。月一覧の sticky を画面の
    // 一番上に貼り付けたいので、上下の余白も落とす。
    padding: 0;
  }
}

// 月一覧の sticky ヘッダ (MonthList の .month, z-index: 10) は、スクロールすると
// エディタの上に白帯として重なる。Quill のリンク入力ツールチップとドロップダウンは
// position: absolute のまま z-index を持たず、祖先の .ql-container も
// スタッキングコンテキストを作らないので、そのままでは帯の裏に隠れて押せない。
// ここで帯より前に出しておく。
.ql-snow .ql-tooltip,
.ql-snow .ql-picker-options {
  z-index: 20;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  width: 100%;
  height: 100%;
}

#nav {
  padding: 30px;
  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
