/** Parse a fetch response as JSON; surface readable errors for HTML/plain error bodies. */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!res.ok) {
      throw new Error(
        snippet
          ? `Request failed (${res.status}): ${snippet}`
          : `Request failed (${res.status}). The server may be overloaded — try again in a moment.`,
      );
    }
    throw new Error("Server returned an unexpected response. Please try again.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      "Server returned invalid JSON. If this keeps happening, restart the dev server and try again.",
    );
  }
}
