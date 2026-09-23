const HOME_PATHS = new Set(["/", "/index.html"]);

function wantsMarkdown(accept) {
  return accept && /\btext\/markdown\b/i.test(accept);
}

function appendVary(headers, value) {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", value);
    return;
  }
  const parts = existing.split(",").map((part) => part.trim().toLowerCase());
  if (!parts.includes(value.toLowerCase())) {
    headers.set("Vary", `${existing}, ${value}`);
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const isHome = HOME_PATHS.has(url.pathname);

  if (isHome && wantsMarkdown(context.request.headers.get("Accept"))) {
    const mdResponse = await context.env.ASSETS.fetch(
      new Request(new URL("/index.md", url.origin), context.request),
    );

    if (mdResponse.ok) {
      const body = await mdResponse.text();
      const headers = new Headers(mdResponse.headers);
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("Vary", "Accept");
      headers.set("x-markdown-tokens", String(Math.ceil(body.length / 4)));
      headers.delete("content-encoding");
      return new Response(body, { status: 200, headers });
    }
  }

  const response = await context.next();
  if (isHome && response.ok) {
    const headers = new Headers(response.headers);
    appendVary(headers, "Accept");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}
