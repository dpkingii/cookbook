import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup }));

import { fetchRecipeDraft, isPrivateAddress } from "./fetch";
import { validateDraft } from "./validate";

const recipe = {
  "@type": "Recipe",
  name: "Fetched Soup",
  recipeIngredient: ["2 cups water", "1 tsp salt"],
  recipeInstructions: [{ "@type": "HowToStep", text: "Boil the water. Add the salt." }],
};
const page = `<html><script type="application/ld+json">${JSON.stringify(recipe)}</script></html>`;

const htmlResponse = (body: string, init: ResponseInit = {}) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html" }, ...init });

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "127.8.8.8", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.10", "169.254.169.254",
    "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255", "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "ff02::1",
  ])("%s is private", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "172.15.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "%s is public",
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    },
  );
});

describe("fetchRecipeDraft", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    lookup.mockReset();
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("fetches a page and returns a valid draft", async () => {
    fetchMock.mockResolvedValue(htmlResponse(page));
    const draft = await fetchRecipeDraft("https://example.com/soup");
    expect(draft.title).toBe("Fetched Soup");
    expect(draft.source?.url).toBe("https://example.com/soup");
    expect(validateDraft(draft)).toEqual([]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["User-Agent"]).toBe("Mozilla/5.0 (compatible; recipe-importer)");
    expect(init.redirect).toBe("manual");
  });

  it.each(["ftp://example.com/x", "file:///etc/passwd", "javascript:alert(1)", "not a url", ""])("refuses %j", async (url) => {
    await expect(fetchRecipeDraft(url)).rejects.toThrow(/http|address/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["http://127.0.0.1/", "http://localhost:3000/", "http://10.0.0.5/x", "http://[::1]/", "http://169.254.169.254/latest", "http://192.168.1.1/"])(
    "refuses %s without fetching",
    async (url) => {
      lookup.mockResolvedValue([{ address: new URL(url).hostname.replace(/[[\]]/g, ""), family: 4 }]);
      await expect(fetchRecipeDraft(url)).rejects.toThrow(/reach/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("refuses a hostname that resolves to a private address, even if one answer is public", async () => {
    lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.7", family: 4 },
    ]);
    await expect(fetchRecipeDraft("https://sneaky.example/")).rejects.toThrow(/reach/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("follows redirects manually and re-checks each hop", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/final" } }))
      .mockResolvedValueOnce(htmlResponse(page));
    const draft = await fetchRecipeDraft("https://example.com/start");
    expect(draft.title).toBe("Fetched Soup");
    expect(fetchMock.mock.calls[1][0]).toBe("https://example.com/final");
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("refuses a redirect to a private host", async () => {
    lookup.mockImplementation(async (host: string) => [{ address: host === "internal.example" ? "10.0.0.1" : "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "http://internal.example/admin" } }));
    await expect(fetchRecipeDraft("https://example.com/start")).rejects.toThrow(/reach/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after three redirects", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "/again" } }));
    await expect(fetchRecipeDraft("https://example.com/loop")).rejects.toThrow(/redirect/i);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("refuses bodies over 3 MB", async () => {
    fetchMock.mockResolvedValue(htmlResponse("a".repeat(3 * 1024 * 1024 + 1)));
    await expect(fetchRecipeDraft("https://example.com/big")).rejects.toThrow(/too large/i);
  });

  it("refuses when content-length is already too large", async () => {
    fetchMock.mockResolvedValue(htmlResponse("tiny", { headers: { "content-length": String(10 * 1024 * 1024) } }));
    await expect(fetchRecipeDraft("https://example.com/big")).rejects.toThrow(/too large/i);
  });

  it("times out after 10 seconds", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    );
    const result = fetchRecipeDraft("https://example.com/slow");
    const assertion = expect(result).rejects.toThrow(/too long/i);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("explains when there is no recipe", async () => {
    fetchMock.mockResolvedValue(htmlResponse("<html><body>hello</body></html>"));
    await expect(fetchRecipeDraft("https://example.com/none")).rejects.toThrow("That page doesn't contain a recipe we can read");
  });

  it("explains http errors and network failures", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 404 }));
    await expect(fetchRecipeDraft("https://example.com/404")).rejects.toThrow(/404/);
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(fetchRecipeDraft("https://example.com/down")).rejects.toThrow(/couldn't reach/i);
  });
});
