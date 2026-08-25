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

// iOS Safari は、フォーカスした入力欄の文字が 16px 未満だとページごと自動で
// 拡大する。Quill の既定は .ql-container が 13px なので、iPhone でエディタを
// タップするたびにズームしてしまう。16px 以上にすれば起きない (viewport に
// maximum-scale を足しても止まるが、指でのピンチ拡大まで殺すので採らない)。
//
// 表示側 (DiaryEntry の .diary__body > .ql-editor) は .ql-container を持たず
// body から 16px を継いでいるので、揃えると表示と編集で文字の大きさも一致する。
//
// #app を足して詳細度を上げてあるのは、quill の CSS の .ql-container (クラス
// 1つ) と同点にして出力順に賭けないため。quill の CSS は DiaryEditor.vue の
// script が import しているので、出力順はこちらの都合で決められない。
#app .ql-container {
  font-size: 1rem;
}

// リンク入力のツールチップの <input> も同じ理由で 13px。こちらは Quill が
// 実行時に差し込む要素で、DiaryEditor.vue の scoped スタイルには data-v- 属性が
// 付かず届かないので、下の z-index の指定と同じくここに置く。
#app .ql-snow .ql-tooltip input[type=text] {
  font-size: 1rem;
}

// 月一覧の sticky ヘッダ (MonthList の .month, z-index: 10) は、スクロールすると
// エディタの上に白帯として重なる。Quill のリンク入力ツールチップと
// ドロップダウンはそのままだと帯の裏に隠れて押せないので、前に出しておく。
// 祖先の .ql-container は position:relative だが z-index:auto で
// スタッキングコンテキストを作らないため、ここでの指定がそのまま効く。

// ツールチップ側は Quill が z-index を持たないので、これだけで足りる。
.ql-snow .ql-tooltip {
  z-index: 20;
}

// ドロップダウン側は事情が違う。Quill 自身が
// `.ql-snow .ql-picker.ql-expanded .ql-picker-options { z-index: 1 }` を
// 持っていて、しかも「開いている間」に効くのはそちら。詳細度で上回らないと
// 負けるので、セレクタを合わせたうえで .ql-toolbar を足して確実に勝たせる
// (同点にして出力順に賭けると、CSS の import 位置を動かしただけで黙って戻る)。
.ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
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
