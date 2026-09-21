const HTTP_URL_RE = /https?:\/\/[^\s<>"']+/giu;
const MARKDOWN_LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s<>"']+)\)/giu;
const TRAILING_PUNCTUATION_RE = /[.,!?;:，。！？；：、)\]}>）】》]+$/u;

export function tokenizeHttpUrls(value) {
  const source = String(value || '');
  const tokens = [];
  let cursor = 0;

  const appendPlainText = (text) => {
    if (!text) return;
    let plainCursor = 0;
    for (const match of text.matchAll(HTTP_URL_RE)) {
      const start = match.index ?? 0;
      const rawUrl = match[0];
      const trailing = rawUrl.match(TRAILING_PUNCTUATION_RE)?.[0] || '';
      const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

      if (start > plainCursor) tokens.push({ type: 'text', value: text.slice(plainCursor, start) });
      if (url) tokens.push({ type: 'link', value: url });
      if (trailing) tokens.push({ type: 'text', value: trailing });
      plainCursor = start + rawUrl.length;
    }
    if (plainCursor < text.length) tokens.push({ type: 'text', value: text.slice(plainCursor) });
  };

  for (const match of source.matchAll(MARKDOWN_LINK_RE)) {
    const start = match.index ?? 0;
    const label = match[1].trim();
    const url = match[2];

    appendPlainText(source.slice(cursor, start));
    tokens.push({ type: 'link', value: url, label: label || url });
    cursor = start + match[0].length;
  }

  appendPlainText(source.slice(cursor));
  return tokens.length ? tokens : [{ type: 'text', value: source }];
}
