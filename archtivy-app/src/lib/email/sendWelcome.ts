/**
 * Send welcome email to new user.
 * TODO: Wire to Clerk webhook (user.created). Requires RESEND_API_KEY.
 */

const SUPPORT_EMAIL = "support@archtivy.com";

function getExploreUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "https://archtivy.com";
  const protocol = base.startsWith("http") ? "" : "https://";
  return `${protocol}${base}/explore/projects`;
}

function getWelcomeHtml(exploreUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:system-ui,sans-serif;background:#f4f4f5;color:#18181b;padding:24px 0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08)"><tr><td style="padding:32px 24px;border-bottom:1px solid #e4e4e7"><h1 style="margin:0;font-size:22px;font-weight:600">Welcome to Archtivy</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#71717a">Architecture, intelligently connected. Discover how projects, products, and professionals connect across cities.</p></td></tr><tr><td style="padding:24px"><h2 style="margin:0 0 12px;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#71717a">Your first connection in 60 seconds</h2><ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;color:#3f3f46"><li>Pick your role (designer, brand, or reader)</li><li>Create your first listing or explore the network</li><li>Connect projects to products and get discovered</li></ol><p style="margin:24px 0 0"><a href="${exploreUrl}" style="display:inline-block;background:#002abf;color:#fff;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;text-decoration:none">Explore Projects</a></p></td></tr><tr><td style="padding:24px;border-top:1px solid #e4e4e7;font-size:13px;color:#71717a"><p style="margin:0">Questions? Reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#002abf">${SUPPORT_EMAIL}</a>.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendWelcomeEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.warn("[sendWelcomeEmail] RESEND_API_KEY not set, skipping");
      return { ok: false, error: "Email not configured" };
    }
    const resend = new Resend(apiKey);
    const exploreUrl = getExploreUrl();
    const html = getWelcomeHtml(exploreUrl);
    const { data, error } = await resend.emails.send({
      from: "Archtivy <introductions@archtivy.com>",
      to: [to],
      replyTo: SUPPORT_EMAIL,
      subject: "Welcome to Archtivy",
      html,
    });
    if (error) {
      console.error("[sendWelcomeEmail]", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[sendWelcomeEmail]", e);
    return { ok: false, error: msg };
  }
}
