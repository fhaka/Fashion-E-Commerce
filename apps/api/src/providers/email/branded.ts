import type { StoreSettings } from '@prisma/client';
import { formatMoney, themeColors } from '@maison/shared';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { getSettings } from '../../services/settings.service';
import { sendEmail } from './index';

/**
 * Branded transactional emails: one table-based HTML layout (works in Gmail, Outlook and
 * Apple Mail) using the store's name/logo, colours and contact details, plus a plain-text
 * version of the same content.
 */
export interface EmailContent {
  subject: string;
  /** Hidden preview line shown by inbox apps next to the subject. */
  preheader?: string;
  heading: string;
  paragraphs: string[];
  /** Two-column rows, e.g. order lines; `strong` rows are emphasised (totals). */
  rows?: { label: string; value: string; strong?: boolean }[];
  button?: { label: string; url: string };
  /** Small print under the button (e.g. "Link expires in 1 hour"). */
  note?: string;
  /** Extra footer line, e.g. newsletter unsubscribe link. */
  footerLink?: { label: string; url: string };
}

export const money = (cents: number) => formatMoney(cents, env.STORE_CURRENCY, env.STORE_LOCALE);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderEmail(c: EmailContent, s: StoreSettings) {
  const theme = themeColors(s);
  const name = s.storeName;
  const font = "Georgia, 'Times New Roman', serif";
  const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  const brand = s.logoUrl
    ? `<img src="${esc(s.logoUrl)}" alt="${esc(name)}" height="40" style="display:block;margin:0 auto;height:40px;width:auto;border:0">`
    : `<span style="font-family:${font};font-size:26px;letter-spacing:8px;text-transform:uppercase;color:${theme.ink}">${esc(name)}</span>`;

  const rows = c.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-top:1px solid #e2ded7">${c.rows
        .map(
          (r) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #e2ded7;font-family:${sans};font-size:14px;color:${theme.ink};${r.strong ? 'font-weight:600' : ''}">${esc(r.label)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e2ded7;font-family:${sans};font-size:14px;color:${theme.ink};white-space:nowrap;${r.strong ? 'font-weight:600' : ''}">${esc(r.value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${theme.ink}"><a href="${esc(c.button.url)}" style="display:inline-block;padding:15px 32px;font-family:${sans};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${theme.bone};text-decoration:none">${esc(c.button.label)}</a></td></tr></table>`
    : '';

  const contact = [s.legalName || name, s.address?.replace(/\n/g, ', '), s.supportEmail].filter(Boolean).map((v) => esc(v as string)).join(' · ');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${theme.bone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader ?? c.paragraphs[0] ?? '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.bone}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:8px 0 28px"><a href="${esc(env.WEB_URL)}" style="text-decoration:none">${brand}</a></td></tr>
<tr><td style="background:#ffffff;padding:40px 36px">
<h1 style="margin:0 0 20px;font-family:${font};font-size:28px;font-weight:400;line-height:1.25;color:${theme.ink}">${esc(c.heading)}</h1>
${c.paragraphs.map((p) => `<p style="margin:0 0 16px;font-family:${sans};font-size:15px;line-height:1.6;color:#3f3c37">${esc(p)}</p>`).join('\n')}
${rows}${button}
${c.note ? `<p style="margin:0;font-family:${sans};font-size:12px;line-height:1.5;color:#706a61">${esc(c.note)}</p>` : ''}
</td></tr>
<tr><td align="center" style="padding:24px 16px;font-family:${sans};font-size:12px;line-height:1.6;color:#706a61">
${contact}<br><a href="${esc(env.WEB_URL)}" style="color:${theme.accentDark}">${esc(env.WEB_URL.replace(/^https?:\/\//, ''))}</a>
${c.footerLink ? `<br><a href="${esc(c.footerLink.url)}" style="color:#706a61">${esc(c.footerLink.label)}</a>` : ''}
</td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    c.heading,
    '',
    ...c.paragraphs.flatMap((p) => [p, '']),
    ...(c.rows?.length ? [...c.rows.map((r) => `${r.label}: ${r.value}`), ''] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ''] : []),
    ...(c.note ? [c.note, ''] : []),
    '—',
    s.legalName || name,
    s.supportEmail,
    env.WEB_URL,
    ...(c.footerLink ? ['', `${c.footerLink.label}: ${c.footerLink.url}`] : []),
  ].join('\n');

  return { html, text };
}

/** Renders and sends a branded email. Never throws: email problems must not break the caller. */
export async function sendBrandedEmail(to: string, content: EmailContent | ((s: StoreSettings) => EmailContent)) {
  try {
    const settings = await getSettings();
    const c = typeof content === 'function' ? content(settings) : content;
    const { html, text } = renderEmail(c, settings);
    await sendEmail({ to, subject: c.subject, text, html, fromName: settings.storeName });
  } catch (err) {
    logger.error({ err: (err as Error).message, to }, 'Could not prepare email');
  }
}
