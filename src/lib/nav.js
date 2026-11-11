// タブごとのURL（マルチページ構成）。パスから初期タブとリンク先を決める。
export const TAB_PATHS = { cards: '', drill: 'drill/', vocab: 'vocabulary/', record: 'record/' };

export function tabFromPath(pathname) {
  if (/\/(drill)\/?$/.test(pathname)) return 'drill';
  if (/\/(vocabulary)\/?$/.test(pathname)) return 'vocab';
  if (/\/(record)\/?$/.test(pathname)) return 'record';
  return 'cards';
}

export function appBaseFromPath(pathname) {
  return pathname.replace(/(drill|vocabulary|record)\/?$/, '');
}

export function tabHrefs(pathname) {
  const base = appBaseFromPath(pathname);
  return {
    cards: base,
    drill: `${base}drill/`,
    vocab: `${base}vocabulary/`,
    record: `${base}record/`,
  };
}
