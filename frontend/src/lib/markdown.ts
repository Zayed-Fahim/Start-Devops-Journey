const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeHref = (raw: string) => {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  return null;
};

const inline = (text: string) => {
  let out = text;
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-surface-sunken px-1 py-0.5">$1</code>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, target: string) => {
    const href = safeHref(target);
    if (!href) return label;
    const external = /^https?:\/\//i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="text-accent underline underline-offset-2" href="${href}"${attrs}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
};

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source).replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listOpen = false;
  let codeOpen = false;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listOpen) return;
    html.push('</ul>');
    listOpen = false;
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      closeParagraph();
      closeList();
      html.push(codeOpen ? '</code></pre>' : '<pre><code>');
      codeOpen = !codeOpen;
      return;
    }
    if (codeOpen) {
      html.push(line);
      return;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeParagraph();
      closeList();
      const level = Math.min(6, heading[1].length + 1);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      return;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      closeParagraph();
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      return;
    }

    if (line.trim() === '') {
      closeParagraph();
      closeList();
      return;
    }

    paragraph.push(line.trim());
  });

  if (codeOpen) html.push('</code></pre>');
  closeParagraph();
  closeList();

  return html.join('\n');
}
