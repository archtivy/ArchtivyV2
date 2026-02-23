import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const data = await resend.emails.send({
      from: "Archtivy <introductions@archtivy.com>",
      to: "mustafaaaltindal@gmail.com",
      subject: "Archtivy Email Test",
      html: "<p>This is a test email from Archtivy.</p>",
    });

    return Response.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, error });
  }
}
