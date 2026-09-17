const HTTP_URL_RE = /https?:\/\/[^\s<>"']+/giu;
const TRAILING_PUNCTUATION_RE = /[.,!?;:，。！？；：、)\]}>）】》]+$/u;

export function tokenizeHttpUrls(value) {
  const source = String(value || '');
  const tokens = [];
  let cursor = 0;

  for (const match of source.matchAll(HTTP_URL_RE)) {
    const start = match.index ?? 0;
    const rawUrl = match[0];
    const trailing = rawUrl.match(TRAILING_PUNCTUATION_RE)?.[0] || '';
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

    if (start > cursor) tokens.push({ type: 'text', value: source.slice(cursor, start) });
    if (url) tokens.push({ type: 'link', value: url });
    if (trailing) tokens.push({ type: 'text', value: trailing });
    cursor = start + rawUrl.length;
  }

  if (cursor < source.length) tokens.push({ type: 'text', value: source.slice(cursor) });
  return tokens.length ? tokens : [{ type: 'text', value: source }];
}
