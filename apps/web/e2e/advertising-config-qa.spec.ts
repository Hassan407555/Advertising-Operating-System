import { expect, test, type Page } from "@playwright/test";

/**
 * Advertising Configuration functional QA.
 * Account: hassan@gmail.com / Hassan123
 * Seed: apps/api/scripts/seed-advertising-config-qa.cjs ([QA ADV])
 *
 * Scope per PROJECT_CONTEXT: Meta relationship IDs only
 * (connection, business, ad account, page, IG, pixel, catalog) + readiness.
 */

const API_BASE = process.env.RC_API_BASE_URL ?? "http://localhost:3001/api";
const EMAIL = process.env.ADV_QA_EMAIL ?? "hassan@gmail.com";
const PASSWORD = process.env.ADV_QA_PASSWORD ?? "Hassan123";

const consoleErrors: string[] = [];
const failedRequests: string[] = [];

async function loginViaUi(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('form[method="post"]')).toBeVisible();
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await loginResponse).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/(dashboard|products|shopify|organization|advertising)/, {
    timeout: 30_000,
  });
}

async function selectStoreByLabel(page: Page, labelPart: string) {
  const select = page.getByLabel("Select store");
  await expect(select).toBeVisible({ timeout: 15_000 });
  const option = select.locator("option").filter({ hasText: labelPart });
  const value = await option.first().getAttribute("value");
  expect(value, `Store option not found: ${labelPart}`).toBeTruthy();
  await select.selectOption(value!);
}

async function goToAdvertising(page: Page) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Advertising" })
    .click();
  await expect(page).toHaveURL(/\/advertising/);
}

async function ensureAdvPage(page: Page, storeLabel: string) {
  await goToAdvertising(page);
  const selectStoreHeading = page.getByRole("heading", { name: "Select a store" });
  if (await selectStoreHeading.isVisible().catch(() => false)) {
    await selectStoreByLabel(page, storeLabel);
  } else {
    await selectStoreByLabel(page, storeLabel);
  }
  await expect(page.getByRole("heading", { name: "Advertising Configuration" })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("Advertising Configuration QA", () => {
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

  test("full Advertising Configuration workflows", async ({ page, request }) => {
    // --- API baseline ---
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
    expect(storesRes.ok()).toBeTruthy();
    const storesBody = await storesRes.json();
    const stores = (storesBody.data ?? storesBody) as Array<{
      id: string;
      name: string;
      advertisingReady: boolean;
    }>;
    const storeA = stores.find((s) => s.name.includes("Store Alpha"));
    const storeB = stores.find((s) => s.name.includes("Store Beta"));
    expect(storeA, "Run seed-advertising-config-qa.cjs").toBeTruthy();
    expect(storeB, "Run seed-advertising-config-qa.cjs").toBeTruthy();
    expect(storeA!.advertisingReady).toBe(true);
    expect(storeB!.advertisingReady).toBe(false);

    const configARes = await request.get(
      `${API_BASE}/stores/${storeA!.id}/advertising-configuration`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(configARes.ok()).toBeTruthy();
    const configABody = await configARes.json();
    const configA = configABody.data ?? configABody;
    expect(configA?.adAccountId).toBeTruthy();
    expect(configA?.metaBusinessId).toContain("qa-adv-meta-biz-alpha");

    const configBRes = await request.get(
      `${API_BASE}/stores/${storeB!.id}/advertising-configuration`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(configBRes.ok()).toBeTruthy();
    const configBBody = await configBRes.json();
    expect(configBBody.data ?? null).toBeNull();

    const unauth = await request.get(
      `${API_BASE}/stores/${storeA!.id}/advertising-configuration`,
    );
    expect(unauth.status()).toBe(401);

    // --- UI: Alpha configured & ready ---
    await ensureAdvPage(page, "Store Alpha");
    await expect(page.getByText(/Ready to advertise:/i)).toBeVisible();
    await expect(page.getByText("Yes", { exact: true })).toBeVisible();
    await expect(page.getByText(/✓ Meta connected/)).toBeVisible();
    await expect(page.getByText(/✓ Ad account selected/)).toBeVisible();
    await expect(page.getByText(/✓ Pixel/)).toBeVisible();

    await expect(page.getByLabel("Meta Business ID")).toHaveValue("qa-adv-meta-biz-alpha");
    await expect(page.getByLabel("Facebook Page ID")).toHaveValue("qa-adv-page-alpha");
    await expect(page.getByLabel("Instagram account ID")).toHaveValue("qa-adv-ig-alpha");
    await expect(page.getByLabel("Pixel ID")).toHaveValue("qa-adv-pixel-alpha");
    await expect(page.getByLabel("Catalog ID")).toHaveValue("qa-adv-catalog-alpha");

    const metaSelect = page.getByLabel("Meta connection");
    await expect(metaSelect.locator("option").filter({ hasText: "Meta Primary" })).toHaveCount(1);
    await expect(metaSelect.locator("option").filter({ hasText: "Meta Secondary" })).toHaveCount(1);

    const adSelect = page.getByLabel("Ad account");
    await expect(adSelect.locator("option").filter({ hasText: "Ad Account One" })).toHaveCount(1);
    await expect(adSelect.locator("option").filter({ hasText: "Ad Account Two" })).toHaveCount(1);

    // Update Alpha config (pixel + catalog) and save
    await page.getByLabel("Pixel ID").fill("qa-adv-pixel-alpha-updated");
    await page.getByLabel("Catalog ID").fill("qa-adv-catalog-alpha-updated");

    const savePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/advertising-configuration") &&
        response.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Save configuration" }).click();
    const saveRes = await savePromise;
    expect(saveRes.ok(), await saveRes.text()).toBeTruthy();
    await expect(page.getByText(/Advertising configuration saved/i)).toBeVisible({
      timeout: 10_000,
    });

    // Persist check via API
    const afterSave = await request.get(
      `${API_BASE}/stores/${storeA!.id}/advertising-configuration`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const afterSaveBody = await afterSave.json();
    const afterSaveConfig = afterSaveBody.data ?? afterSaveBody;
    expect(afterSaveConfig.pixelId).toBe("qa-adv-pixel-alpha-updated");
    expect(afterSaveConfig.catalogId).toBe("qa-adv-catalog-alpha-updated");

    // Browser refresh keeps values
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Advertising Configuration" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel("Pixel ID")).toHaveValue("qa-adv-pixel-alpha-updated", {
      timeout: 15_000,
    });

    // Store switch → Beta: empty config, NOT ready, no Alpha field leakage
    await selectStoreByLabel(page, "Store Beta");
    await expect(page.getByRole("heading", { name: "Advertising Configuration" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Ready to advertise:/i)).toBeVisible();
    await expect(page.getByText("No", { exact: true })).toBeVisible();
    await expect(page.getByText(/✗ Meta connected|Meta is not connected/i).first()).toBeVisible();
    await expect(page.getByLabel("Meta Business ID")).toHaveValue("");
    await expect(page.getByLabel("Facebook Page ID")).toHaveValue("");
    await expect(page.getByLabel("Pixel ID")).toHaveValue("");
    await expect(page.getByLabel("Pixel ID")).not.toHaveValue("qa-adv-pixel-alpha-updated");

    // Configure Beta from empty → becomes ready after required fields
    const metaConn = page.getByLabel("Meta connection");
    const metaPrimaryValue = await metaConn
      .locator("option")
      .filter({ hasText: "Meta Primary" })
      .first()
      .getAttribute("value");
    expect(metaPrimaryValue).toBeTruthy();
    await metaConn.selectOption(metaPrimaryValue!);

    await page.getByLabel("Meta Business ID").fill("qa-adv-meta-biz-beta");

    const adAccount = page.getByLabel("Ad account");
    const adOneValue = await adAccount
      .locator("option")
      .filter({ hasText: "Ad Account One" })
      .first()
      .getAttribute("value");
    expect(adOneValue).toBeTruthy();
    await adAccount.selectOption(adOneValue!);

    await page.getByLabel("Facebook Page ID").fill("qa-adv-page-beta");
    await page.getByLabel("Instagram account ID").fill("qa-adv-ig-beta");
    await page.getByLabel("Pixel ID").fill("qa-adv-pixel-beta");
    await page.getByLabel("Catalog ID").fill("qa-adv-catalog-beta");

    const saveBetaPromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/stores/${storeB!.id}/advertising-configuration`) &&
        response.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Save configuration" }).click();
    expect((await saveBetaPromise).ok()).toBeTruthy();
    await expect(page.getByText(/Advertising configuration saved/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Yes", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Switch back to Alpha — still has Alpha values (no Beta leakage)
    await selectStoreByLabel(page, "Store Alpha");
    await expect(page.getByLabel("Pixel ID")).toHaveValue("qa-adv-pixel-alpha-updated", {
      timeout: 15_000,
    });
    await expect(page.getByLabel("Meta Business ID")).toHaveValue("qa-adv-meta-biz-alpha");
    await expect(page.getByLabel("Meta Business ID")).not.toHaveValue("qa-adv-meta-biz-beta");

    // Direct URL + back/forward
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.goto("/advertising", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Advertising Configuration" })).toBeVisible({
      timeout: 20_000,
    });
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await page.goForward();
    await expect(page).toHaveURL(/\/advertising/, { timeout: 20_000 });

    // Validation: invalid Meta connection id via API
    const badPut = await request.put(
      `${API_BASE}/stores/${storeA!.id}/advertising-configuration`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          metaPlatformConnectionId: "nonexistent-meta-connection-id",
        },
      },
    );
    expect(badPut.status()).toBe(400);

    // Console / failed request hygiene (ignore expected 400 validation above)
    const relevantFailed = failedRequests.filter(
      (msg) => !msg.includes("nonexistent-meta-connection-id") && !msg.includes(" 400 "),
    );
    const relevantConsole = consoleErrors.filter(
      (msg) =>
        !msg.includes("picsum.photos") &&
        !msg.includes("Failed to load resource") &&
        !msg.includes("net::ERR_"),
    );

    expect(relevantFailed, `Failed API:\n${relevantFailed.join("\n")}`).toEqual([]);
    expect(relevantConsole, `Console:\n${relevantConsole.join("\n")}`).toEqual([]);
  });
});
