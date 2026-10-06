"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { contentPageSchema } from "@maison/shared";
import {
  Blocks,
  fillText,
  renderableMarkdown,
} from "@/components/content/Markdown";
import {
  ConfirmDialog,
  ImageField,
  PageHeader,
  Panel,
  Tabs,
  TextArea,
} from "@/components/admin/ui";
import { useDemo, useSite } from "@/components/layout/SiteProvider";
import { Button } from "@/components/ui/Button";
import { FormError, Input, zodFieldErrors } from "@/components/ui/Field";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, useAdminQuery } from "@/lib/admin";
import type { ContentPage } from "@/lib/types";
import { toast } from "@/stores/toast";

type Slug = ContentPage["slug"];
const LABELS: Record<Slug, { label: string; path: string; hint: string }> = {
  about: {
    label: "About",
    path: "/about",
    hint: "Title, intro and image make the hero. A section written as a list of “**Title** — text” items becomes the numbered pillars band.",
  },
  "shipping-returns": {
    label: "Shipping & returns",
    path: "/shipping-returns",
    hint: "Put {{shipping_rates}} on its own line to show the delivery table from Settings.",
  },
  privacy: {
    label: "Privacy policy",
    path: "/privacy",
    hint: "Template text — have it reviewed by a lawyer for your country before launch.",
  },
  terms: {
    label: "Terms of sale",
    path: "/terms",
    hint: "Template text — have it reviewed by a lawyer for your country before launch.",
  },
};

const PLACEHOLDERS = [
  "store_name",
  "legal_name",
  "support_email",
  "phone",
  "address",
  "return_days",
  "free_shipping_threshold",
  "currency",
  "tax_rate",
  "tax_note",
  "reservation_minutes",
];

interface Draft {
  title: string;
  intro: string;
  body: string;
  imageUrl: string;
}
const toDraft = (p: ContentPage): Draft => ({
  title: p.title,
  intro: p.intro ?? "",
  body: p.body,
  imageUrl: p.imageUrl ?? "",
});

export default function PagesAdmin() {
  const demo = useDemo();
  const settings = useSite();
  const { data, setData } = useAdminQuery<ContentPage[]>("/admin/pages");
  const [slug, setSlug] = useState<Slug>("about");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const page = data?.find((p) => p.slug === slug) ?? null;
  useEffect(() => {
    if (page) setDraft(toDraft(page));
    setErrors({});
    setFormError("");
    // Reload the draft only when switching pages or after saving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, page?.updatedAt]);

  const preview = useMemo(
    () => (draft ? renderableMarkdown(draft.body, settings) : null),
    [draft, settings],
  );
  const dirty = !!(
    page &&
    draft &&
    JSON.stringify(toDraft(page)) !== JSON.stringify(draft)
  );

  const replacePage = (updated: ContentPage) =>
    setData(
      (list) =>
        list?.map((p) => (p.slug === updated.slug ? updated : p)) ?? list,
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const payload = {
      title: draft.title,
      intro: draft.intro || null,
      body: draft.body,
      imageUrl: draft.imageUrl || null,
    };
    const parsed = contentPageSchema.safeParse(payload);
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error.issues));
    setErrors({});
    setFormError("");
    setSaving(true);
    try {
      replacePage(
        await api<ContentPage>(`/admin/pages/${slug}`, {
          method: "PUT",
          body: payload,
        }),
      );
      toast.success(`${LABELS[slug].label} saved`);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not save the page",
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      replacePage(
        await api<ContentPage>(`/admin/pages/${slug}/reset`, {
          method: "POST",
        }),
      );
      toast.success("Page restored from the template");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Could not reset the page",
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pages"
        description="Your About page and customer-service and legal pages."
      />
      {demo && (
        <p
          className="border border-camel/40 bg-camel/10 px-4 py-3 text-sm text-stone-700"
          role="status"
        >
          Pages are read-only in the demo. Edit the text to see the live
          preview; in a real shop, saving publishes it immediately.
        </p>
      )}
      <Tabs
        value={slug}
        onChange={setSlug}
        tabs={(Object.keys(LABELS) as Slug[]).map((s) => ({
          value: s,
          label: LABELS[s].label,
        }))}
      />

      {!draft || !page ? (
        <div className="skeleton h-96" />
      ) : (
        <form onSubmit={save} noValidate className="grid gap-8 xl:grid-cols-2">
          <Panel
            title="Content"
            actions={
              <a
                href={LABELS[slug].path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-ink"
              >
                View page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            }
            bodyClassName="space-y-5 p-6"
          >
            <FormError message={formError} />
            <Input
              label="Title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              error={errors.title}
            />
            <TextArea
              label="Introduction"
              value={draft.intro}
              onChange={(v) => setDraft({ ...draft, intro: v })}
              rows={3}
              error={errors.intro}
              hint="Shown under the title. Optional."
            />
            {slug === "about" && (
              <ImageField
                label="Hero image"
                value={draft.imageUrl}
                onChange={(v) => setDraft({ ...draft, imageUrl: v })}
                folder="pages"
                previewClassName="h-28 w-24"
              />
            )}
            <TextArea
              label="Page text"
              value={draft.body}
              onChange={(v) => setDraft({ ...draft, body: v })}
              rows={22}
              error={errors.body}
              className="font-mono text-[0.8rem] leading-relaxed"
              hint={LABELS[slug].hint}
            />
            <details className="text-xs text-stone-600">
              <summary className="cursor-pointer select-none text-ink">
                Formatting help
              </summary>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <code>## Heading</code> starts a section (listed in the page
                  contents) · <code>### Sub-heading</code>
                </li>
                <li>
                  <code>- item</code> for lists · <code>**bold**</code> ·{" "}
                  <code>*italic*</code> · <code>[link text](/contact)</code>
                </li>
                <li>Leave an empty line between paragraphs.</li>
                <li>
                  Placeholders, filled from Settings:{" "}
                  {PLACEHOLDERS.map((p) => (
                    <code
                      key={p}
                      className="mr-1.5 inline-block"
                    >{`{{${p}}}`}</code>
                  ))}
                </li>
              </ul>
            </details>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResetting(true)}
                disabled={!!demo}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to template
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-xs text-stone-500">
                  {dirty
                    ? "Unsaved changes"
                    : `Saved ${formatDate(page.updatedAt, true)}`}
                </span>
                <Button
                  type="submit"
                  loading={saving}
                  disabled={!!demo || !dirty}
                >
                  Save page
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Preview" bodyClassName="p-0">
            {/* Focusable so keyboard users can scroll the preview. */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Page preview"
              className="max-h-[80vh] overflow-y-auto bg-paper p-8 focus-visible:outline-1 focus-visible:outline-ink"
            >
              <p className="eyebrow mb-3 text-stone-500">
                {LABELS[slug].label}
              </p>
              <h2 className="font-display text-4xl font-light">
                {fillText(draft.title, settings)}
              </h2>
              {draft.intro && (
                <p className="mt-4 text-stone-600">
                  {fillText(draft.intro, settings)}
                </p>
              )}
              {preview && (
                <div className="mt-8">
                  <Blocks blocks={preview.lead} settings={settings} />
                  {preview.sections.map((s) => (
                    <section key={s.id} className="mt-10">
                      <h3 className="mb-4 font-display text-2xl font-light">
                        {s.title}
                      </h3>
                      <Blocks blocks={s.blocks} settings={settings} />
                    </section>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </form>
      )}

      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={reset}
        title="Reset to template?"
        body={`This replaces your ${LABELS[slug].label} text with the original template. It can't be undone.`}
        confirmLabel="Reset page"
        danger
      />
    </div>
  );
}
