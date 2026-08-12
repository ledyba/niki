// 画面幅が「狭い(スマホ幅)」かどうかを1か所で持つ。
//
// 見た目の出し分けは基本 CSS のメディアクエリでやる。ここが要るのは Quill だけで、
// Quill 2 はツールバーの構成をインスタンス生成時にしか受け取らない
// (modules/toolbar が持つのは addHandler/attach/update だけで、後から差し替える API も
// destroy も無い)。CSS でボタンを隠すのは Quill の内部クラス名に依存するので、
// アップグレードで静かに壊れる。代わりに「生成時に渡す設定そのものを選ぶ」ため、
// 幅の判定を JS 側にも持つ。
//
// 境界の値は client/src/styles/_breakpoints.scss の $mobile-max と揃えること。
import { ref, readonly, type Ref } from 'vue';

export const MOBILE_QUERY = '(max-width: 48em)';

function watchMobile(): Ref<boolean> {
  const state = ref(false);
  // jsdom には matchMedia が無い(undefined のまま)。テスト環境では常に
  // 「広い画面」として扱い、ここで落ちないようにする。
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return state;
  }
  const query = window.matchMedia(MOBILE_QUERY);
  state.value = query.matches;
  // 回転やウィンドウサイズ変更で境界をまたいだら追従する。
  query.addEventListener('change', (event) => {
    state.value = event.matches;
  });
  return state;
}

/** 狭い画面(スマホ幅)かどうか。リアクティブ。 */
export const isMobile = readonly(watchMobile());
