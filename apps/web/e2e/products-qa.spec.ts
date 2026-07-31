import { expect, test, type Page } from "@playwright/test";

/**
 * Products module functional QA — runs against local app as a real user.
 * Account: hassan@gmail.com / Hassan123 (password meets uppercase rule)
 * Seeded data is tagged [QA SEED].
 */

const API_BASE = process.env.RC_API_BASE_URL ?? "http://localhost:3001/api";
const EMAIL = process.env.PRODUCTS_QA_EMAIL ?? "hassan@gmail.com";
const PASSWORD = process.env.PRODUCTS_QA_PASSWORD ?? "Hassan123";

const consoleErrors: string[] = [];
const failedRequests: string[] = [];

async function loginViaUi(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({
    timeout: 20_000,
  });
  // Wait for client hydration so the React submit handler is attached.
  await expect(page.locator('form[method="post"]')).toBeVisible();
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const response = await loginResponse;
  expect(response.ok(), await response.text()).toBeTruthy();

  await expect(page).toHaveURL(/\/(dashboard|products|shopify|organization)/, {
    timeout: 30_000,
  });
  // Credentials must never appear in the URL (GET form leak).
  expect(page.url()).not.toMatch(/password=/i);
}

async function goToProducts(page: Page) {
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Products" }).click();
  await expect(page).toHaveURL(/\/products/);
}

async function ensureStoreSelected(page: Page, labelPart: string) {
  const select = page.getByLabel("Select store");
  await expect(select).toBeVisible({ timeout: 15_000 });
  const current = await select.inputValue();
  if (!current) {
    await expect(page.getByRole("heading", { name: "Select a store" })).toBeVisible({
      timeout: 10_000,
    });
  }
  await selectStoreByLabel(page, labelPart);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
    timeout: 20_000,
  });
}

async function selectStoreByLabel(page: Page, labelPart: string) {
  const select = page.getByLabel("Select store");
  await expect(select).toBeVisible({ timeout: 15_000 });
  const option = select.locator("option").filter({ hasText: labelPart });
  const value = await option.first().getAttribute("value");
  expect(value).toBeTruthy();
  await select.selectOption(value!);
}

test.describe("Products module QA", () => {
  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    failedRequests.length = 0;

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
    page.on("response", (response) => {
      const url = response.url();
      if (!url.includes("/api/")) return;
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.request().method()} ${url}`);
      }
    });

    await loginViaUi(page);
  });

  test("full Products workflows", async ({ page, request }) => {
    // --- API: login + list stores + products ---
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
    const loginBody = await loginRes.json();
    const token = loginBody.data?.tokens?.accessToken as string;
    expect(token).toBeTruthy();

    const storesRes = await request.get(`${API_BASE}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(storesRes.ok(), await storesRes.text()).toBeTruthy();
    const storesBody = await storesRes.json();
    const stores = (storesBody.data ?? storesBody) as Array<{
      id: string;
      name: string;
      advertisingReady: boolean;
    }>;
    expect(stores.length).toBeGreaterThanOrEqual(2);

    const storeA = stores.find((s) => s.name.includes("Store Alpha"));
    const storeB = stores.find((s) => s.name.includes("Store Beta"));
    expect(storeA, "Store Alpha missing — run seed-products-qa.cjs").toBeTruthy();
    expect(storeB, "Store Beta missing — run seed-products-qa.cjs").toBeTruthy();

    const productsRes = await request.get(
      `${API_BASE}/stores/${storeA!.id}/products?page=1&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(productsRes.ok(), await productsRes.text()).toBeTruthy();
    const productsBody = await productsRes.json();
    const productsPayload = productsBody.data ?? productsBody;
    expect(productsPayload.data?.length ?? productsPayload.length).toBeGreaterThan(0);
    expect(productsPayload.meta?.total ?? 0).toBeGreaterThan(20);
    expect(productsPayload.advertisingEligibility?.eligible).toBe(true);

    // Product details API
    const firstProductId = productsPayload.data[0].id as string;
    const detailRes = await request.get(
      `${API_BASE}/stores/${storeA!.id}/products/${firstProductId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(detailRes.ok(), await detailRes.text()).toBeTruthy();
    const detailBody = await detailRes.json();
    const detail = detailBody.data ?? detailBody;
    expect(detail.id).toBe(firstProductId);
    expect(detail).toHaveProperty("variants");
    expect(detail).toHaveProperty("images");
    expect(detail).toHaveProperty("brand");
    expect(Array.isArray(detail.variants)).toBeTruthy();
    expect(Array.isArray(detail.images)).toBeTruthy();
    expect(Array.isArray(detail.collections)).toBeTruthy();

    // Search API
    const searchRes = await request.get(
      `${API_BASE}/stores/${storeA!.id}/products?search=${encodeURIComponent("Unique Searchable")}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(searchRes.ok()).toBeTruthy();
    const searchBody = await searchRes.json();
    const searchPayload = searchBody.data ?? searchBody;
    expect(searchPayload.data.length).toBeGreaterThanOrEqual(1);
    expect(searchPayload.data[0].title).toContain("Unique Searchable");

    // Isolation: Store B products endpoint must not return Alpha titles
    const storeBProducts = await request.get(
      `${API_BASE}/stores/${storeB!.id}/products?page=1&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(storeBProducts.ok()).toBeTruthy();
    const storeBBody = await storeBProducts.json();
    const storeBPayload = storeBBody.data ?? storeBBody;
    for (const row of storeBPayload.data) {
      expect(row.title).not.toContain("Alpha Product");
    }

    // Unauthorized without token
    const unauth = await request.get(`${API_BASE}/stores/${storeA!.id}/products`);
    expect(unauth.status()).toBe(401);

    // --- UI: navigate via sidebar ---
    await goToProducts(page);

    // Multi-store: require explicit selection before product list
    await ensureStoreSelected(page, "Store Alpha");
    await expect(page.getByText(/Advertise products for/i)).toBeVisible();

    // Product cards load
    await expect(page.getByRole("link", { name: /Open / }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("[QA SEED] Alpha Product").first()).toBeVisible();

    // Sync Products button/link
    const syncLink = page.getByRole("link", { name: "Sync Products" });
    await expect(syncLink).toBeVisible();

    // Search: hit + clear
    await page.getByLabel("Search products").fill("Unique Searchable");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("[QA SEED] Unique Searchable Widget")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Alpha Product 01")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByRole("link", { name: /Open / }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Empty search results
    await page.getByLabel("Search products").fill("zzz-no-match-token-999");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("heading", { name: "No matching products" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByRole("link", { name: /Open / }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Pagination: Next then Previous
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(page.getByText(/Page 1 of/)).toBeVisible({ timeout: 15_000 });

    // Draft product: Generate Campaign disabled
    await page.getByLabel("Search products").fill("Alpha Product 03");
    await page.getByRole("button", { name: "Search" }).click();
    const draftCard = page.getByRole("link", { name: /Open .*Alpha Product 03/i });
    await expect(draftCard).toBeVisible({ timeout: 15_000 });
    await expect(
      draftCard.getByRole("button", { name: /Generate Campaign|Resume Interview/ }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Clear" }).click();

    // Product details via card click
    await page.getByLabel("Search products").fill("Unique Searchable Widget");
    await page.getByRole("button", { name: "Search" }).click();
    const productCard = page.getByRole("link", {
      name: /Open .*Unique Searchable Widget/i,
    });
    await expect(productCard).toBeVisible({ timeout: 15_000 });

    const detailResponsePromise = page.waitForResponse(
      (response) =>
        /\/stores\/[^/]+\/products\/[^/?]+$/.test(response.url()) &&
        response.request().method() === "GET",
      { timeout: 30_000 },
    );
    await productCard.click();
    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok(), await detailResponse.text()).toBeTruthy();
    await expect(page).toHaveURL(/\/products\/[^/]+$/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: /Unique Searchable Widget/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Shopify Product ID")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate Campaign|Resume Interview/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sync Product" })).toBeVisible();

    // Cancel any active session so Generate starts clean
    const searchable = (productsPayload.data as Array<{
      id: string;
      title: string;
      activeSessionId: string | null;
    }>).find((p) => p.title.includes("Unique Searchable Widget"));
    if (searchable?.activeSessionId) {
      await request.post(`${API_BASE}/ai-sessions/${searchable.activeSessionId}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Generate Campaign from details → AI session
    const generateBtn = page.getByRole("button", { name: /Generate Campaign|Resume Interview/ });
    await expect(generateBtn).toBeEnabled({ timeout: 15_000 });

    const entryPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/advertising-entry") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await generateBtn.click();
    expect((await entryPromise).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/ai-sessions\//, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "AI Session" })).toBeVisible({
      timeout: 20_000,
    });

    // Back to products
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel("Select store")).toHaveValue(/.+/);

    // Store switch → Beta products only; Meta is optional for Generate Campaign
    await ensureStoreSelected(page, "Store Alpha");
    await selectStoreByLabel(page, "Store Beta");
    await expect(page.getByLabel("Search products")).toHaveValue("", {
      timeout: 10_000,
    });
    await expect(page.getByText("[QA SEED] Beta Only Product").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Alpha Product")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Advertising not ready" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Products not ready" })).toHaveCount(0);
    await expect(
      page
        .getByRole("link", { name: /Open .*Beta Only Product 01/i })
        .getByRole("button", { name: /Generate Campaign|Resume Interview/ }),
    ).toBeEnabled();

    // Direct URL
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 20_000,
    });

    // Sync Products navigates to Shopify
    await ensureStoreSelected(page, "Store Alpha");
    await page.getByRole("link", { name: "Sync Products" }).first().click();
    await expect(page).toHaveURL(/\/shopify/, { timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/products/, { timeout: 20_000 });

    // Forward
    await page.goForward();
    await expect(page).toHaveURL(/\/shopify/, { timeout: 20_000 });
    await page.goto("/products");
    await ensureStoreSelected(page, "Store Alpha");

    // Soft console / failed request checks (allow image CDN noise filtered below)
    const relevantConsole = consoleErrors.filter(
      (msg) =>
        !msg.includes("picsum.photos") &&
        !msg.includes("Failed to load resource") &&
        !msg.includes("net::ERR_"),
    );
    const relevantFailed = failedRequests.filter(
      (msg) => !msg.includes("picsum.photos"),
    );

    expect(
      relevantFailed,
      `Failed API requests:\n${relevantFailed.join("\n")}`,
    ).toEqual([]);
    expect(
      relevantConsole,
      `Console errors:\n${relevantConsole.join("\n")}`,
    ).toEqual([]);
  });
});
