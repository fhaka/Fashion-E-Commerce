/**
 * Tiny, safe Markdown subset for the editable content pages (Admin → Pages):
 *   ## Section heading · ### Sub-heading · paragraphs · "- " lists · **bold** · *italic* · [text](url)
 * plus {{placeholders}} filled from store settings. It never produces raw HTML.
 */

export type Inline = { type: 'text' | 'strong' | 'em'; text: string } | { type: 'link'; text: string; href: string };
export type Block =
  | { type: 'p'; content: Inline[] }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'shipping-rates' };
export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section';

/** Only same-site paths, http(s) and mailto links are rendered as links. */
export function safeHref(href: string) {
  const h = href.trim();
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (/^(https?:\/\/|mailto:)[^\s]+$/i.test(h)) return h;
  return null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: 'strong', text: m[1] });
    else if (m[2] !== undefined) out.push({ type: 'em', text: m[2] });
    else {
      const href = safeHref(m[4]);
      out.push(href ? { type: 'link', text: m[3], href } : { type: 'text', text: m[3] });
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

export function fillPlaceholders(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}

/** Splits a page into an untitled lead (before the first "## ") and titled sections. */
export function parseMarkdown(source: string): { lead: Block[]; sections: Section[] } {
  const lead: Block[] = [];
  const sections: Section[] = [];
  const used = new Set<string>();
  let target = lead;
  let paragraph: string[] = [];
  let list: Inline[][] | null = null;

  const flush = () => {
    if (paragraph.length) target.push({ type: 'p', content: parseInline(paragraph.join(' ')) });
    if (list) target.push({ type: 'ul', items: list });
    paragraph = [];
    list = null;
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      const title = line.slice(3).trim();
      let id = slugify(title);
      while (used.has(id)) id += '-2';
      used.add(id);
      const section: Section = { id, title, blocks: [] };
      sections.push(section);
      target = section.blocks;
    } else if (line.startsWith('### ')) {
      flush();
      target.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line === '{{shipping_rates}}') {
      flush();
      target.push({ type: 'shipping-rates' });
    } else if (/^[-*] /.test(line)) {
      if (paragraph.length) flush();
      list ??= [];
      list.push(parseInline(line.slice(2).trim()));
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return { lead, sections };
}

/**
 * A section written as a list of "**Title** — text" items becomes a feature grid
 * (used for the "What we believe" pillars on the About page).
 */
export function asPillars(section: Section) {
  if (section.blocks.length !== 1 || section.blocks[0].type !== 'ul') return null;
  const items = section.blocks[0].items.map((item) => {
    const [first, ...rest] = item;
    if (first?.type !== 'strong') return null;
    const body = rest
      .map((i) => i.text)
      .join('')
      .replace(/^\s*[—–:-]\s*/, '')
      .trim();
    return { title: first.text, body };
  });
  return items.every(Boolean) ? (items as { title: string; body: string }[]) : null;
}
