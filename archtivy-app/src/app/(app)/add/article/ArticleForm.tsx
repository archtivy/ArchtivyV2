"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddListingLayout } from "@/components/add/AddListingLayout";
import { UploadBox } from "@/components/add/UploadBox";
import { uploadArticleCover } from "@/lib/storage/articleCovers";
import { readTimeMinutes, renderMarkdown } from "@/lib/markdown/render";
import {
  saveArticleDraft,
  submitArticleForReview,
  setArticleRelatedEntities,
} from "@/app/actions/articles";

/**
 * Write Article flow (brief §2), on the Form/Publishing archetype already
 * established by /add/project — AddListingLayout gives the same form + sticky
 * sidebar + mobile action bar, so this is not a new flow shape.
 *
 * NO AI ASSIST. The brief allows one "if added"; there is no author-facing AI
 * pattern anywhere in this app to reuse (all AI is admin/backend — image SEO,
 * embeddings, match attributes), so building one here would mean inventing the
 * AI Visibility Contract UI rather than following it. Left out of v1
 * deliberately; nothing here blocks adding it later.
 *
 * BODY IS MARKDOWN, not HTML and not a rich-text editor — there is no editor
 * library in this codebase and Project Description is a plain textarea. The
 * live preview below renders through the same server-safe allow-list renderer
 * the article page uses, so what an author sees here is what publishes.
 */

export interface TopicOption {
  id: string;
  label: string;
}

export interface MentionOption {
  id: string;
  label: string;
  sub: string | null;
  kind: "listing" | "profile";
}

export function ArticleForm({
  topics,
  mentionOptions,
}: {
  topics: TopicOption[];
  mentionOptions: MentionOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [articleId, setArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dek, setDek] = useState("");
  const [topicNodeId, setTopicNodeId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const readTime = useMemo(() => readTimeMinutes(bodyMarkdown), [bodyMarkdown]);
  const bodyChars = bodyMarkdown.trim().length;
  const canSubmit = title.trim().length >= 3 && bodyChars >= 200;

  const filteredMentions = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return [];
    return mentionOptions
      .filter((m) => !mentions.includes(m.id))
      .filter((m) => m.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, mentionOptions, mentions]);

  const chosenMentions = mentionOptions.filter((m) => mentions.includes(m.id));

  async function onCoverSelected(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const result = await uploadArticleCover(file);
    setUploading(false);
    if (result.url === null) setMessage({ kind: "error", text: result.error });
    else setCoverImageUrl(result.url);
  }

  function persist(): Promise<string | null> {
    return saveArticleDraft(articleId, {
      title,
      dek,
      bodyMarkdown,
      coverImageUrl,
      topicNodeId,
    }).then(async (r) => {
      if (!r.ok) {
        setMessage({ kind: "error", text: r.error });
        return null;
      }
      setArticleId(r.id);
      if (mentions.length > 0 || articleId) {
        await setArticleRelatedEntities(
          r.id,
          chosenMentions.map((m) => ({ kind: m.kind, id: m.id }))
        );
      }
      return r.id;
    });
  }

  function onSaveDraft() {
    setMessage(null);
    startTransition(async () => {
      const id = await persist();
      if (id) setMessage({ kind: "ok", text: "Draft saved." });
    });
  }

  function onSubmitForReview() {
    setMessage(null);
    startTransition(async () => {
      const id = await persist();
      if (!id) return;
      const result = await submitArticleForReview(id);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      router.push("/magazine?submitted=1");
    });
  }

  const label = "block text-sm font-medium text-zinc-900 dark:text-zinc-100";
  const field =
    "mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <AddListingLayout
      sidebar={
        <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Before submitting
          </h2>
          <ul className="space-y-2 text-sm">
            <Check done={title.trim().length >= 3}>A title</Check>
            <Check done={bodyChars >= 200}>
              A few paragraphs {bodyChars > 0 && `(${bodyChars} characters)`}
            </Check>
            <Check done={Boolean(coverImageUrl)}>A cover image (optional)</Check>
            <Check done={Boolean(topicNodeId)}>A topic (optional)</Check>
          </ul>

          <p className="border-t border-zinc-200 pt-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            Estimated read time: <strong>{readTime} min</strong>. Calculated from the body —
            you don&rsquo;t set it.
          </p>

          {/* The review gate, stated up front rather than discovered after
              pressing Submit. */}
          <p className="rounded-md bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Articles are reviewed before they appear in the Magazine. You&rsquo;ll keep the
            draft and can edit it if it comes back with notes.
          </p>

          <div className="hidden gap-2 lg:flex">
            <SaveButton onClick={onSaveDraft} disabled={pending || uploading} />
            <SubmitButton onClick={onSubmitForReview} disabled={pending || uploading || !canSubmit} />
          </div>
        </div>
      }
      mobileActions={
        <div className="flex gap-2">
          <SaveButton onClick={onSaveDraft} disabled={pending || uploading} />
          <SubmitButton onClick={onSubmitForReview} disabled={pending || uploading || !canSubmit} />
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Write an article
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Long-form writing for the Archtivy Magazine. Link it to the projects, products and
            people it discusses.
          </p>
        </div>

        {message && (
          <p
            role="status"
            className={`rounded-md px-3 py-2 text-sm ${
              message.kind === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            }`}
          >
            {message.text}
          </p>
        )}

        <div>
          <label htmlFor="article-title" className={label}>
            Title
          </label>
          <input
            id="article-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            className={field}
            placeholder="What is the story?"
          />
        </div>

        <div>
          <label htmlFor="article-dek" className={label}>
            Dek <span className="font-normal text-zinc-500">— one or two lines of teaser</span>
          </label>
          <textarea
            id="article-dek"
            value={dek}
            onChange={(e) => setDek(e.target.value)}
            maxLength={280}
            rows={2}
            className={field}
          />
        </div>

        <div>
          <span className={label}>Cover image</span>
          {coverImageUrl ? (
            <div className="mt-1.5 flex items-start gap-3">
              <span className="relative h-24 w-36 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                <Image src={coverImageUrl} alt="" fill sizes="144px" className="object-cover" />
              </span>
              <button
                type="button"
                onClick={() => setCoverImageUrl("")}
                className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-1.5">
              <UploadBox
                id="article-cover"
                onFilesSelected={onCoverSelected}
                accept="image/*"
                multiple={false}
                disabled={uploading}
                primaryText={uploading ? "Uploading…" : "Add a cover image"}
                hintText="JPG, PNG, WebP or AVIF · up to 8MB"
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="article-topic" className={label}>
            Topic
          </label>
          {/* Shared platform taxonomy (discipline dimension), not a separate
              editorial category list — Blueprint §25. */}
          <select
            id="article-topic"
            value={topicNodeId}
            onChange={(e) => setTopicNodeId(e.target.value)}
            className={field}
          >
            <option value="">Choose a topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label htmlFor="article-body" className={label}>
              Body
            </label>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
            >
              {preview ? "Back to writing" : "Preview"}
            </button>
          </div>

          {preview ? (
            <div className="mt-1.5 rounded-md border border-zinc-300 bg-cream p-5 dark:border-zinc-700">
              {bodyMarkdown.trim() ? (
                renderMarkdown(bodyMarkdown)
              ) : (
                <p className="text-sm text-zinc-500">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <>
              <textarea
                id="article-body"
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                rows={18}
                className={`${field} font-mono text-[13px] leading-relaxed`}
                placeholder={"## A heading\n\nWrite in **markdown**. Link with [text](https://example.com).\n\n> A pulled quote.\n\n- A list item"}
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Markdown: ## and ### headings, **bold**, *italic*, [links](url), - lists, &gt;
                quotes. HTML is not rendered.
              </p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="article-mentions" className={label}>
            Mentioned in this story{" "}
            <span className="font-normal text-zinc-500">— optional</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Link real projects, products, designers or brands. They appear at the foot of the
            article and the link works in both directions.
          </p>
          <input
            id="article-mentions"
            value={mentionQuery}
            onChange={(e) => setMentionQuery(e.target.value)}
            className={field}
            placeholder="Search the archive…"
            autoComplete="off"
          />
          {filteredMentions.length > 0 && (
            <ul className="mt-1 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {filteredMentions.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMentions((prev) => [...prev, m.id]);
                      setMentionQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100">
                      {m.label}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{m.sub ?? m.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {chosenMentions.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {chosenMentions.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setMentions((prev) => prev.filter((x) => x !== m.id))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {m.label}
                    <span aria-hidden>×</span>
                    <span className="sr-only">Remove</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AddListingLayout>
  );
}

function Check({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
      <span
        className={`mt-[3px] inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${
          done ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100" : "border-zinc-300 dark:border-zinc-700"
        }`}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

function SaveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100"
    >
      Save draft
    </button>
  );
}

function SubmitButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
    >
      Submit for review
    </button>
  );
}
