import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    ok: true,
    message: "Proxy GET working",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const selfie = formData.get("selfie");

  if (!selfie || typeof selfie === "string" || !(selfie instanceof File)) {
    return json({ ok: false, error: "Missing selfie file" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await selfie.arrayBuffer());
    const base64 = buffer.toString("base64");

    return json({
      ok: true,
      result: {
        mimeType: selfie.type || "image/jpeg",
        base64,
      },
    });
  } catch {
    return json({ ok: false, error: "Processing error" }, { status: 500 });
  }
}
