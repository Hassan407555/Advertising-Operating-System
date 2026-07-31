import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * AI Campaign Generation functional QA
 * Flow: Products/Interview → Generate (Gemini) → Review → Save Draft
 * Account: hassan@gmail.com / Hassan123
 * Uses existing advertising-ready [QA ADV] data.
 */

const API_BASE = process.env.RC_API_BASE_URL ?? "http://127.0.0.1:3001/api";
const EMAIL = process.env.AI_QA_EMAIL ?? "hassan@gmail.com";
const PASSWORD = process.env.AI_QA_PASSWORD ?? "Hassan123";

const consoleErrors: string[] = [];
const failedRequests: string[] = [];

type Store = { id: string; name: string; advertisingReady: boolean };
type Product = {
  id: string;
  title: string;
  canAdvertise: boolean;
  activeSessionId: string | null;
};

async function loginViaUi(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({
    timeout: 20_000,
  });
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
    timeout: 45_000,
  });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible({
    timeout: 45_000,
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
  if (await input.isVisible().catch(() => false)) {
    await expect(input).toHaveValue("", { timeout: 15_000 });
  }
}

async function expectAssistantPrompt(page: Page, partial: string | RegExp) {
  await expect(page.getByText(partial).first()).toBeVisible({ timeout: 20_000 });
}

async function apiLogin(request: APIRequestContext) {
  const loginRes = await request.post(`${API_BASE}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
  return (await loginRes.json()).data.tokens.accessToken as string;
}

async function getReadyStoreAndProduct(request: APIRequestContext, token: string) {
  const storesRes = await request.get(`${API_BASE}/stores`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(storesRes.ok()).toBeTruthy();
  const stores = ((await storesRes.json()).data ?? []) as Store[];
  const store = stores.find((s) => s.advertisingReady && s.name.includes("Alpha"));
  expect(store, "Need an advertising-ready Alpha store").toBeTruthy();

  const productsRes = await request.get(`${API_BASE}/stores/${store!.id}/products?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(productsRes.ok()).toBeTruthy();
  const productsPayload = (await productsRes.json()).data;
  const product = (productsPayload.data as Product[]).find((p) => p.canAdvertise);
  expect(product, "Need an advertisable product").toBeTruthy();
  return { store: store!, product: product! };
}

async function cancelActiveSession(
  request: APIRequestContext,
  token: string,
  product: Product,
) {
  if (!product.activeSessionId) return;
  await request.post(`${API_BASE}/ai-sessions/${product.activeSessionId}/cancel`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function startAdvertiseSession(page: Page, productTitle: string) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Products" })
    .click();
  await expect(page).toHaveURL(/\/products/);
  await selectStoreByLabel(page, "Store Alpha");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
    timeout: 20_000,
  });

  const searchTerm = productTitle.replace("[QA ADV] ", "").replace("[AI-QA] ", "");
  await page.getByLabel("Search products").fill(searchTerm);
  await page.getByRole("button", { name: "Search" }).click();
  const productCard = page.getByRole("link", { name: new RegExp(`Open .*${searchTerm}`, "i") });
  await expect(productCard).toBeVisible({ timeout: 15_000 });
  const advertiseBtn = productCard.getByRole("button", {
    name: /Generate Campaign|Resume Interview|Advertise Product/,
  });
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

  const sessionId = page.url().split("/ai-sessions/")[1]?.split(/[?#]/)[0];
  expect(sessionId).toBeTruthy();
  return sessionId!;
}

async function completeInterview(
  page: Page,
  adType: "IMAGE" | "CAROUSEL" | "VIDEO" | "NONE",
) {
  await expectAssistantPrompt(page, /target country/i);
  await answerStep(page, "United States");
  await expectAssistantPrompt(page, /language/i);
  await answerStep(page, "English");
  await expectAssistantPrompt(page, /daily budget/i);
  await answerStep(page, "40");
  await expectAssistantPrompt(page, /campaign objective/i);
  await answerStep(page, "CONVERSIONS");
  await expectAssistantPrompt(page, /ad type/i);
  await answerStep(page, adType);

  if (adType === "CAROUSEL") {
    await expectAssistantPrompt(page, /carousel cards/i);
    await answerStep(page, "3");
    await expectAssistantPrompt(page, /highlight multiple products/i);
    await answerStep(page, "yes");
  }

  if (adType === "VIDEO") {
    await expectAssistantPrompt(page, /video duration/i);
    await answerStep(page, "30s");
    await expectAssistantPrompt(page, /video style/i);
    await answerStep(page, "UGC");
    await expectAssistantPrompt(page, /tone/i);
    await answerStep(page, "Friendly");
  }

  await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
    timeout: 20_000,
  });
}

async function generateCampaign(page: Page, sessionId: string) {
  const generateBtn = page.getByRole("button", { name: "Generate Campaign" });
  await expect(generateBtn).toBeEnabled({ timeout: 15_000 });

  const generateResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/ai-sessions/${sessionId}/generate`) &&
      response.request().method() === "POST",
    { timeout: 120_000 },
  );

  await generateBtn.click();
  await expect(page.getByRole("button", { name: "Generating…" })).toBeVisible({
    timeout: 10_000,
  });

  const res = await generateResponse;
  expect(res.ok(), await res.text()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Review campaign" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Campaign generated|Ready for review/i).first()).toBeVisible({
    timeout: 15_000,
  });
}

async function fillRequiredReviewFields(
  page: Page,
  adType: "IMAGE" | "CAROUSEL" | "VIDEO" | "NONE",
) {
  const campaignName = page.getByLabel("Campaign name", { exact: true });
  await expect(campaignName).toBeVisible({ timeout: 15_000 });
  const currentName = await campaignName.inputValue();
  if (!currentName.trim()) {
    await campaignName.fill(`QA ${adType} Campaign`);
  } else {
    await campaignName.fill(`${currentName.trim()} (QA edit)`);
  }

  const objective = page.getByLabel("Objective", { exact: true });
  if (!(await objective.inputValue()).trim()) {
    await objective.fill("CONVERSIONS");
  }

  const audience = page.getByLabel("Audience", { exact: true });
  if (!(await audience.inputValue()).trim()) {
    await audience.fill("US English shoppers interested in this product");
  }

  const budget = page.getByLabel("Daily budget", { exact: true });
  const budgetVal = await budget.inputValue();
  if (!budgetVal || Number(budgetVal) <= 0) {
    await budget.fill("40");
  }

  const cta = page.getByLabel("CTA", { exact: true });
  if (!(await cta.inputValue()).trim()) {
    await cta.fill("SHOP_NOW");
  }

  if (adType === "IMAGE") {
    const headlines = page.getByLabel("Headlines (one per line)");
    if (!(await headlines.inputValue()).trim()) {
      await headlines.fill("Shop the best product\nLimited offer today");
    }
    const primary = page.getByLabel("Primary text");
    if (!(await primary.inputValue()).trim()) {
      await primary.fill("Discover why customers love this product.");
    }
    const description = page.getByLabel("Description", { exact: true });
    if (!(await description.inputValue()).trim()) {
      await description.fill("High quality. Fast shipping.");
    }
    const brief = page.getByLabel("Creative brief");
    if (!(await brief.inputValue()).trim()) {
      await brief.fill("Lifestyle product shot with clear CTA.");
    }
  }

  if (adType === "CAROUSEL") {
    const titles = page.getByLabel("Card titles (one per line)");
    if (!(await titles.inputValue()).trim()) {
      await titles.fill("Card 1\nCard 2\nCard 3");
    }
    const descs = page.getByLabel("Card descriptions (one per line)");
    if (!(await descs.inputValue()).trim()) {
      await descs.fill("Benefit A\nBenefit B\nBenefit C");
    }
    const strategy = page.getByLabel("Creative strategy");
    if (!(await strategy.inputValue()).trim()) {
      await strategy.fill("Feature different benefits across cards.");
    }
  }

  if (adType === "VIDEO") {
    const hook = page.getByLabel("Hook", { exact: true });
    if (!(await hook.inputValue()).trim()) {
      await hook.fill("Stop scrolling — this changes everything");
    }
    const script = page.getByLabel("Video script");
    if (!(await script.inputValue()).trim()) {
      await script.fill("Open on product. Show problem. Reveal solution. CTA.");
    }
    const storyboard = page.getByLabel("Storyboard (one shot per line)");
    if (!(await storyboard.inputValue()).trim()) {
      await storyboard.fill("Shot 1: Hook\nShot 2: Demo\nShot 3: CTA");
    }
    const shots = page.getByLabel("Shot list (one per line)");
    if (!(await shots.inputValue()).trim()) {
      await shots.fill("Close-up product\nLifestyle use\nEnd card CTA");
    }
  }

  if (adType === "NONE") {
    const notes = page.getByLabel("Creative notes");
    if (!(await notes.inputValue()).trim()) {
      await notes.fill("Creative will be attached later from an existing page post.");
    }
  }
}

async function saveDraft(page: Page, sessionId: string, isUpdate = false) {
  const saveBtn = page.getByRole("button", {
    name: isUpdate ? "Update Draft" : "Save Draft",
  });
  await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
  const saveRes = page.waitForResponse(
    (response) =>
      response.url().includes(`/ai-sessions/${sessionId}/save-draft`) &&
      response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await saveBtn.click();
  const res = await saveRes;
  expect(res.ok(), await res.text()).toBeTruthy();
  await expect(
    page.getByText(isUpdate ? /Draft campaign updated|Draft saved/i : /Draft campaign saved|Draft saved/i).first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Draft saved/i).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("AI Campaign Generation module QA", () => {
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

  test("generate review save for IMAGE CAROUSEL VIDEO NONE", async ({ page, request }) => {
    const token = await apiLogin(request);
    let { store, product } = await getReadyStoreAndProduct(request, token);

    // Unauthorized generate / save-draft
    const unauthGenerate = await request.post(
      `${API_BASE}/ai-sessions/nonexistent/generate`,
    );
    expect(unauthGenerate.status()).toBe(401);
    const unauthSave = await request.post(
      `${API_BASE}/ai-sessions/nonexistent/save-draft`,
      { data: { payload: {} } },
    );
    expect(unauthSave.status()).toBe(401);

    // 404 generate
    const missingGen = await request.post(
      `${API_BASE}/ai-sessions/nonexistent-session-id/generate`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(missingGen.status()).toBe(404);

    // --- IMAGE: Products entry → interview → generate → review → save → update ---
    await cancelActiveSession(request, token, product);
    // refresh product after cancel
    ({ product } = await getReadyStoreAndProduct(request, token));
    const imageSessionId = await startAdvertiseSession(page, product.title);
    await completeInterview(page, "IMAGE");

    // Direct URL + refresh while ready to generate
    await page.goto(`/ai-sessions/${imageSessionId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible({
      timeout: 45_000,
    });
    if (await page.getByRole("heading", { name: "Unable to open session" }).isVisible().catch(() => false)) {
      await selectStoreByLabel(page, "Store Alpha");
    }
    await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
      timeout: 45_000,
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible({
      timeout: 45_000,
    });
    if (await page.getByLabel("Select store").isVisible().catch(() => false)) {
      await selectStoreByLabel(page, "Store Alpha");
    }
    await expect(page.getByRole("heading", { name: "Generate Campaign" })).toBeVisible({
      timeout: 45_000,
    });

    // Wrong-status generate (already READY is ok — probe INTERVIEWING via API on a side session later)
    await generateCampaign(page, imageSessionId);

    // Generated payload present via API
    const imageGet = await request.get(`${API_BASE}/ai-sessions/${imageSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(imageGet.ok()).toBeTruthy();
    const imageBody = (await imageGet.json()).data;
    expect(imageBody.status).toBe("REVIEWING");
    expect(imageBody.workflowContext.generatedCampaign.campaignType).toBe("IMAGE");
    expect(imageBody.workflowContext.generatedCampaign.payload.campaignName).toBeTruthy();
    expect(imageBody.workflowContext.generatedCampaign.payload.headlines?.length).toBeGreaterThan(0);
    expect(imageBody.shopifyStoreId).toBe(store.id);
    expect(imageBody.productId).toBe(product.id);

    await expect(page.getByText("IMAGE", { exact: true }).first()).toBeVisible();
    await fillRequiredReviewFields(page, "IMAGE");
    await saveDraft(page, imageSessionId, false);

    const afterSave = await request.get(`${API_BASE}/ai-sessions/${imageSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterSaveBody = (await afterSave.json()).data;
    expect(afterSaveBody.status).toBe("REVIEWING");
    const draftIds = afterSaveBody.workflowContext.draftCampaignIds;
    expect(draftIds?.campaignId).toBeTruthy();
    expect(draftIds?.adSetId).toBeTruthy();
    expect(draftIds?.adId).toBeTruthy();
    expect(draftIds?.creativeId).toBeTruthy();

    // Edit + update same draft (no duplicate)
    await fillRequiredReviewFields(page, "IMAGE");
    await saveDraft(page, imageSessionId, true);
    const afterUpdate = await request.get(`${API_BASE}/ai-sessions/${imageSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterUpdateBody = (await afterUpdate.json()).data;
    expect(afterUpdateBody.workflowContext.draftCampaignIds.campaignId).toBe(
      draftIds.campaignId,
    );

    // Refresh persistence
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Review campaign" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Draft saved/i).first()).toBeVisible();
    await expect(page.getByLabel("Campaign name")).not.toHaveValue("");

    // Browser back/forward
    await page.getByRole("link", { name: "Back to AI Sessions" }).click();
    await expect(page).toHaveURL(/\/ai-sessions$/, { timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/ai-sessions/${imageSessionId}`), {
      timeout: 20_000,
    });
    await page.goForward();
    await expect(page).toHaveURL(/\/ai-sessions$/, { timeout: 20_000 });

    // Return to session for regenerate
    await page.goto(`/ai-sessions/${imageSessionId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Review campaign" })).toBeVisible({
      timeout: 45_000,
    });

    // Regenerate from REVIEWING (same session)
    const [regenRes] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/ai-sessions/${imageSessionId}/generate`) &&
          response.request().method() === "POST",
        { timeout: 120_000 },
      ),
      page.getByRole("button", { name: "Regenerate Campaign" }).click(),
    ]);
    expect(regenRes.ok(), await regenRes.text()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Review campaign" })).toBeVisible({
      timeout: 30_000,
    });

    const afterRegen = await request.get(`${API_BASE}/ai-sessions/${imageSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterRegenBody = (await afterRegen.json()).data;
    expect(afterRegenBody.status).toBe("REVIEWING");
    expect(afterRegenBody.workflowContext.generatedCampaign.campaignType).toBe("IMAGE");
    expect(afterRegenBody.workflowContext.generatedCampaign.provider).toBeTruthy();

    // Save draft without generation payload shape — empty body validation
    const badSave = await request.post(
      `${API_BASE}/ai-sessions/${imageSessionId}/save-draft`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { payload: { campaignType: "IMAGE" } },
      },
    );
    expect([400, 422]).toContain(badSave.status());

    // --- CAROUSEL ---
    ({ product } = await getReadyStoreAndProduct(request, token));
    await cancelActiveSession(request, token, product);
    ({ product } = await getReadyStoreAndProduct(request, token));
    const carouselSessionId = await startAdvertiseSession(page, product.title);
    await completeInterview(page, "CAROUSEL");
    await generateCampaign(page, carouselSessionId);

    const carouselGet = await request.get(`${API_BASE}/ai-sessions/${carouselSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const carouselBody = (await carouselGet.json()).data;
    expect(carouselBody.workflowContext.generatedCampaign.campaignType).toBe("CAROUSEL");
    expect(
      carouselBody.workflowContext.generatedCampaign.payload.cardTitles?.length,
    ).toBeGreaterThan(0);

    await fillRequiredReviewFields(page, "CAROUSEL");
    await saveDraft(page, carouselSessionId, false);

    // --- VIDEO ---
    ({ product } = await getReadyStoreAndProduct(request, token));
    await cancelActiveSession(request, token, product);
    ({ product } = await getReadyStoreAndProduct(request, token));
    const videoSessionId = await startAdvertiseSession(page, product.title);
    await completeInterview(page, "VIDEO");
    await generateCampaign(page, videoSessionId);

    const videoGet = await request.get(`${API_BASE}/ai-sessions/${videoSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const videoBody = (await videoGet.json()).data;
    expect(videoBody.workflowContext.generatedCampaign.campaignType).toBe("VIDEO");
    expect(videoBody.workflowContext.generatedCampaign.payload.hook).toBeTruthy();
    expect(videoBody.workflowContext.generatedCampaign.payload.videoScript).toBeTruthy();

    await fillRequiredReviewFields(page, "VIDEO");
    await saveDraft(page, videoSessionId, false);

    // --- NONE (no uploaded media) ---
    ({ product } = await getReadyStoreAndProduct(request, token));
    await cancelActiveSession(request, token, product);
    ({ product } = await getReadyStoreAndProduct(request, token));
    const noneSessionId = await startAdvertiseSession(page, product.title);
    await completeInterview(page, "NONE");
    await generateCampaign(page, noneSessionId);

    const noneGet = await request.get(`${API_BASE}/ai-sessions/${noneSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const noneBody = (await noneGet.json()).data;
    expect(noneBody.workflowContext.generatedCampaign.campaignType).toBe("NONE");
    expect(noneBody.workflowContext.generatedCampaign.payload.requiresCreative).toBe(false);

    await fillRequiredReviewFields(page, "NONE");
    await saveDraft(page, noneSessionId, false);

    // Mobile viewport smoke while the reviewing session is still active
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ai-sessions/${noneSessionId}`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("navigation", { name: "Primary" }).or(page.getByLabel("Select store")),
    ).toBeVisible({ timeout: 45_000 });
    if (await page.getByLabel("Select store").isVisible().catch(() => false)) {
      await selectStoreByLabel(page, "Store Alpha");
    }
    await expect(page.getByRole("heading", { name: "Review campaign" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("button", { name: /Update Draft|Save Draft/ })).toBeVisible();

    // Generate blocked when interview incomplete (cancels active reviewing session)
    await page.setViewportSize({ width: 1280, height: 720 });
    ({ product } = await getReadyStoreAndProduct(request, token));
    await cancelActiveSession(request, token, product);
    ({ product } = await getReadyStoreAndProduct(request, token));
    const partialId = await startAdvertiseSession(page, product.title);
    await expectAssistantPrompt(page, /target country/i);
    await answerStep(page, "United States");
    const earlyGenerate = await request.post(`${API_BASE}/ai-sessions/${partialId}/generate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(earlyGenerate.status()).toBe(400);
    await request.post(`${API_BASE}/ai-sessions/${partialId}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Console / failed requests — allow expected auth and validation errors
    const relevantFailed = failedRequests.filter((msg) => {
      if (/\b401\b/.test(msg)) return false;
      if (/\b400\b/.test(msg)) return false;
      if (/\b404\b/.test(msg)) return false;
      if (/\b422\b/.test(msg)) return false;
      if (msg.includes("nonexistent")) return false;
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
