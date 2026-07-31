import { expect, test, type Page } from "@playwright/test";

/**
 * AI Interview functional QA (guided wizard — not a free-form chatbot).
 * Account: hassan@gmail.com / Hassan123
 * Uses existing advertising-ready [QA ADV] data.
 */

const API_BASE = process.env.RC_API_BASE_URL ?? "http://127.0.0.1:3001/api";
const EMAIL = process.env.AI_QA_EMAIL ?? "hassan@gmail.com";
const PASSWORD = process.env.AI_QA_PASSWORD ?? "Hassan123";

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
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") && response.request().method() === "POST",
      { timeout: 45_000 },
    ),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
  await expect(page).toHaveURL(/\/(dashboard|products|shopify|organization|advertising|ai-sessions)/, {
    timeout: 30_000,
  });
}

async function selectStoreByLabel(page: Page, labelPart: string) {
  const select = page.getByLabel("Select store");
  await expect(select).toBeVisible({ timeout: 15_000 });
  const option = select.locator("option").filter({ hasText: labelPart });
  const value = await option.first().getAttribute("value");
  expect(value, `Missing store: ${labelPart}`).toBeTruthy();
  await select.selectOption(value!);
}

async function answerStep(page: Page, text: string) {
  const input = page.getByRole("textbox", { name: "Interview answer" });
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.click();
  await input.fill(text);
  await expect(input).toHaveValue(text, { timeout: 5_000 });
  const continueBtn = page.getByRole("button", { name: "Continue" });
  await expect(continueBtn).toBeEnabled({ timeout: 10_000 });
  const advance = page.waitForResponse(
    (response) =>
      response.url().includes("/advance") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await continueBtn.click();
  const res = await advance;
  expect(res.ok(), await res.text()).toBeTruthy();
  // Input unmounts when the interview finishes (READY_FOR_ANALYSIS).
  if (await input.isVisible().catch(() => false)) {
    await expect(input).toHaveValue("", { timeout: 15_000 });
  }
}

async function expectAssistantPrompt(page: Page, partial: string | RegExp) {
  await expect(page.getByText(partial).first()).toBeVisible({ timeout: 20_000 });
}

test.describe("AI Interview module QA", () => {
  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    failedRequests.length = 0;

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("response", (response) => {
      if (!response.url().includes("/api/")) return;
      if (response.status() >= 400) {
        failedRequests.push(
          `${response.status()} ${response.request().method()} ${response.url()}`,
        );
      }
    });

    await loginViaUi(page);
  });

  test("full interview workflows", async ({ page, request }) => {
    // --- API baseline ---
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
    const token = (await loginRes.json()).data.tokens.accessToken as string;

    const storesRes = await request.get(`${API_BASE}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(storesRes.ok()).toBeTruthy();
    const stores = ((await storesRes.json()).data ?? []) as Array<{
      id: string;
      name: string;
      advertisingReady: boolean;
    }>;
    const storeA = stores.find((s) => s.advertisingReady && s.name.includes("Alpha"));
    expect(storeA, "Need an advertising-ready Alpha store").toBeTruthy();

    const productsRes = await request.get(
      `${API_BASE}/stores/${storeA!.id}/products?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(productsRes.ok()).toBeTruthy();
    const productsPayload = (await productsRes.json()).data;
    const product = (productsPayload.data as Array<{
      id: string;
      title: string;
      canAdvertise: boolean;
      activeSessionId: string | null;
    }>).find((p) => p.canAdvertise);
    expect(product, "Need an advertisable product").toBeTruthy();

    // Cancel any leftover active session for clean Advertise start
    if (product!.activeSessionId) {
      await request.post(`${API_BASE}/ai-sessions/${product!.activeSessionId}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Unauthorized
    const unauth = await request.get(`${API_BASE}/ai-sessions`);
    expect(unauth.status()).toBe(401);

    // --- UI: entry from Products → Advertise Product ---
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await expect(page).toHaveURL(/\/products/);
    await selectStoreByLabel(page, "Store Alpha");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("Search products").fill(product!.title.replace("[QA ADV] ", ""));
    await page.getByRole("button", { name: "Search" }).click();
    const advertiseBtn = page
      .locator("tr", { hasText: product!.title })
      .getByRole("button", { name: /Advertise Product|Resume Interview/ });
    await expect(advertiseBtn).toBeEnabled({ timeout: 15_000 });

    const entryPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/advertising-entry") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await advertiseBtn.click();
    expect((await entryPromise).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/ai-sessions\//, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "AI Session" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Interview" })).toBeVisible();

    const sessionUrl = page.url();
    const sessionId = sessionUrl.split("/ai-sessions/")[1]?.split(/[?#]/)[0];
    expect(sessionId).toBeTruthy();

    // First prompt (country) + product context
    await expectAssistantPrompt(page, /target country/i);
    await expect(page.getByText(product!.id)).toBeVisible();
    await expect(page.getByText(/Awaiting input|Interview/i).first()).toBeVisible();

    // Empty answer: Continue disabled
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    // Valid country + language
    await answerStep(page, "United States");
    await expectAssistantPrompt(page, /language/i);
    await answerStep(page, "English");
    await expectAssistantPrompt(page, /daily budget/i);

    // Invalid budget → 400 toast
    const budgetInput = page.getByRole("textbox", { name: "Interview answer" });
    await budgetInput.fill("not-a-number");
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    const badBudget = page.waitForResponse(
      (response) => response.url().includes("/advance") && response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Continue" }).click();
    expect((await badBudget).status()).toBe(400);
    await expect(page.getByText(/positive number|Unable to save|dailyBudget/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await answerStep(page, "50");
    await expectAssistantPrompt(page, /campaign objective/i);
    await answerStep(page, "CONVERSIONS");
    await expectAssistantPrompt(page, /ad type/i);

    // Invalid ad type
    const adTypeInput = page.getByRole("textbox", { name: "Interview answer" });
    await adTypeInput.fill("BANNER");
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    const badAdType = page.waitForResponse(
      (response) => response.url().includes("/advance") && response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Continue" }).click();
    expect((await badAdType).status()).toBe(400);
    await expect(page.getByText(/IMAGE|CAROUSEL|VIDEO|NONE|Unable to save|adType/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Pause mid-interview: refresh must restore messages (persistence)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "AI Session" })).toBeVisible({
      timeout: 30_000,
    });
    const storeSelect = page.getByLabel("Select store");
    if (await storeSelect.isVisible().catch(() => false)) {
      await selectStoreByLabel(page, "Store Alpha");
      await expect(page.getByRole("heading", { name: "AI Session" })).toBeVisible({
        timeout: 20_000,
      });
    }
    await expect(page.getByText("United States", { exact: true })).toBeVisible();
    await expect(page.getByText("CONVERSIONS", { exact: true })).toBeVisible();
    await expectAssistantPrompt(page, /ad type/i);

    // Resume re-asks the current step
    await expect(page.getByRole("button", { name: "Resume" })).toBeEnabled({
      timeout: 15_000,
    });
    const [resumeRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/ai-sessions/${sessionId}/resume`) &&
          response.request().method() === "POST",
        { timeout: 30_000 },
      ),
      page.getByRole("button", { name: "Resume" }).click(),
    ]);
    expect(resumeRes.ok(), await resumeRes.text()).toBeTruthy();
    await expectAssistantPrompt(page, /ad type/i);

    // Complete IMAGE path
    await answerStep(page, "IMAGE");
    await expect(page.getByText(/Interview completed|ready for analysis|Generate Campaign/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
      timeout: 15_000,
    });

    // API confirm status
    const sessionGet = await request.get(`${API_BASE}/ai-sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sessionGet.ok()).toBeTruthy();
    const sessionBody = (await sessionGet.json()).data;
    expect(sessionBody.status).toBe("READY_FOR_ANALYSIS");
    expect(sessionBody.workflowContext.answers.country).toBe("United States");
    expect(sessionBody.workflowContext.answers.adType).toBe("IMAGE");
    expect(sessionBody.shopifyStoreId).toBe(storeA!.id);
    expect(sessionBody.productId).toBe(product!.id);

    // Direct URL + back link
    await page.goto(`/ai-sessions/${sessionId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("link", { name: "Back to AI Sessions" }).click();
    await expect(page).toHaveURL(/\/ai-sessions$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "AI Sessions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open" }).first()).toBeVisible();

    // --- Adaptive VIDEO interview on a fresh session ---
    // Cancel current so Advertise creates a new path... PRODUCT still has READY_FOR_ANALYSIS as active!
    // Cancel the completed-but-still-active (READY_FOR_ANALYSIS is in ACTIVE statuses)
    const cancelComplete = await request.post(`${API_BASE}/ai-sessions/${sessionId}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(cancelComplete.ok(), await cancelComplete.text()).toBeTruthy();

    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await selectStoreByLabel(page, "Store Alpha");
    await page.getByLabel("Search products").fill(product!.title.replace("[QA ADV] ", ""));
    await page.getByRole("button", { name: "Search" }).click();
    const advertise2 = page
      .locator("tr", { hasText: product!.title })
      .getByRole("button", { name: /Advertise Product|Resume Interview/ });
    await expect(advertise2).toBeEnabled({ timeout: 15_000 });
    const entry2 = page.waitForResponse(
      (r) => r.url().includes("/advertising-entry") && r.request().method() === "POST",
      { timeout: 30_000 },
    );
    await advertise2.click();
    expect((await entry2).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/ai-sessions\//, { timeout: 30_000 });
    const sessionId2 = page.url().split("/ai-sessions/")[1]?.split(/[?#]/)[0];
    expect(sessionId2).not.toBe(sessionId);

    await answerStep(page, "Canada");
    await answerStep(page, "English");
    await answerStep(page, "25");
    await answerStep(page, "TRAFFIC");
    await answerStep(page, "VIDEO");
    // Adaptive video steps
    await expectAssistantPrompt(page, /video duration/i);
    await answerStep(page, "30s");
    await expectAssistantPrompt(page, /video style/i);
    await answerStep(page, "UGC");
    await expectAssistantPrompt(page, /tone/i);
    await answerStep(page, "Friendly");
    await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
      timeout: 20_000,
    });

    const videoSession = await request.get(`${API_BASE}/ai-sessions/${sessionId2}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const videoBody = (await videoSession.json()).data;
    expect(videoBody.workflowContext.answers.adType).toBe("VIDEO");
    expect(videoBody.workflowContext.answers.videoDuration).toBe("30s");
    expect(videoBody.workflowContext.plannedSteps).toContain("videoTone");

    // Cancel VIDEO session, then confirm NONE is accepted without adaptive creative steps
    const cancelVideo = await request.post(`${API_BASE}/ai-sessions/${sessionId2}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(cancelVideo.ok(), await cancelVideo.text()).toBeTruthy();

    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await selectStoreByLabel(page, "Store Alpha");
    await page.getByLabel("Search products").fill(product!.title.replace("[QA ADV] ", ""));
    await page.getByRole("button", { name: "Search" }).click();
    const advertiseNone = page
      .locator("tr", { hasText: product!.title })
      .getByRole("button", { name: /Advertise Product|Resume Interview/ });
    await expect(advertiseNone).toBeEnabled({ timeout: 15_000 });
    const entryNone = page.waitForResponse(
      (r) => r.url().includes("/advertising-entry") && r.request().method() === "POST",
      { timeout: 30_000 },
    );
    await advertiseNone.click();
    expect((await entryNone).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/ai-sessions\//, { timeout: 30_000 });
    const sessionIdNone = page.url().split("/ai-sessions/")[1]?.split(/[?#]/)[0];

    await answerStep(page, "United States");
    await answerStep(page, "English");
    await answerStep(page, "30");
    await answerStep(page, "TRAFFIC");
    await answerStep(page, "NONE");
    await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
      timeout: 20_000,
    });

    const noneSession = await request.get(`${API_BASE}/ai-sessions/${sessionIdNone}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const noneBody = (await noneSession.json()).data;
    expect(noneBody.workflowContext.answers.adType).toBe("NONE");
    expect(noneBody.workflowContext.plannedSteps).not.toContain("videoTone");
    expect(noneBody.workflowContext.plannedSteps).not.toContain("carouselCardCount");

    // Cancel from UI
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/Session cancelled|closed/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Browser back/forward from sessions list
    await page.goto("/ai-sessions", { waitUntil: "domcontentloaded" });
    await selectStoreByLabel(page, "Store Alpha");
    await expect(page.getByRole("heading", { name: "AI Sessions" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("link", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/\/ai-sessions\//, { timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/ai-sessions$/, { timeout: 20_000 });
    await page.goForward();
    await expect(page).toHaveURL(/\/ai-sessions\//, { timeout: 20_000 });

    // 404 session
    const missing = await request.get(`${API_BASE}/ai-sessions/nonexistent-session-id`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(missing.status()).toBe(404);

    // Console / failed requests — allow expected 400 validation + 404
    const relevantFailed = failedRequests.filter((msg) => {
      // Expected validation / not-found probes from this suite
      if (/\b400\b/.test(msg)) return false;
      if (/\b404\b/.test(msg)) return false;
      if (msg.includes("nonexistent-session-id")) return false;
      return true;
    });
    const relevantConsole = consoleErrors.filter(
      (msg) =>
        !msg.includes("Failed to load resource") &&
        !msg.includes("net::ERR_") &&
        !msg.includes("picsum.photos"),
    );

    expect(relevantFailed, `Failed API:\n${relevantFailed.join("\n")}`).toEqual([]);
    expect(relevantConsole, `Console:\n${relevantConsole.join("\n")}`).toEqual([]);
  });
});
