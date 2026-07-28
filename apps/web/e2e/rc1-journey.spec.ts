import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_BASE = process.env.RC_API_BASE_URL ?? "http://localhost:3001/api";

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

async function registerViaUi(page: Page, data: {
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
  await page.getByLabel("Organization Name").fill(data.organizationName);
  await page.getByLabel("First Name").fill(data.firstName);
  await page.getByLabel("Last Name").fill(data.lastName);
  await page.getByLabel("Email").fill(data.email);
  await page.getByLabel("Password").fill(data.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

async function logoutViaUi(page: Page) {
  await page.locator("header details summary").click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
}

async function sidebarGoto(page: Page, label: string) {
  await page.getByLabel("Sidebar").getByRole("link", { name: label, exact: true }).click();
}

async function seedAdAccount(request: APIRequestContext, accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const connection = await request.post(`${API_BASE}/platform-connections`, {
    headers,
    data: {
      platform: "META",
      accountId: `act_rc_${Date.now()}`,
      accountName: "RC Meta Connection",
    },
  });
  expect(connection.ok(), await connection.text()).toBeTruthy();
  const connectionBody = await connection.json();
  const connectionId = connectionBody.data?.id ?? connectionBody.id;

  const adAccount = await request.post(`${API_BASE}/ad-accounts`, {
    headers,
    data: {
      platformConnectionId: connectionId,
      platform: "META",
      externalId: `act_ext_${Date.now()}`,
      accountName: "RC Meta Ad Account",
      currency: "USD",
      timezone: "America/New_York",
      status: "ACTIVE",
      isActive: true,
    },
  });
  expect(adAccount.ok(), await adAccount.text()).toBeTruthy();
  const adAccountBody = await adAccount.json();
  return {
    connectionId,
    adAccountId: adAccountBody.data?.id ?? adAccountBody.id,
  };
}

async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.data ?? body;
}

test.describe.configure({ mode: "serial" });

test.describe("RC-1 full customer journey", () => {
  const password = "Password1";
  const ownerEmail = uniqueEmail("rc-owner");
  const inviteeEmail = uniqueEmail("rc-invitee");
  const orgName = `RC Org ${Date.now()}`;
  let campaignId = "";
  let invitationToken = "";
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });
  });

  test("01 landing redirects unauthenticated users to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });

  test("02 unauthorized deep link prompts login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(unauthorized|login)/, { timeout: 30_000 });
  });

  test("03 register creates owner session and lands on dashboard", async ({ page }) => {
    await page.context().clearCookies();
    await registerViaUi(page, {
      organizationName: orgName,
      email: ownerEmail,
      firstName: "RC",
      lastName: "Owner",
      password,
    });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });
  });

  test("04 session persists across browser refresh", async ({ page }) => {
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("05 logout then login restores session", async ({ page }) => {
    await logoutViaUi(page);
    await loginViaUi(page, ownerEmail, password);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("06 API refresh token rotation works", async ({ request }) => {
    const login = await apiLogin(request, ownerEmail, password);
    const refresh = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: login.tokens.refreshToken },
    });
    expect(refresh.ok(), await refresh.text()).toBeTruthy();
    const body = await refresh.json();
    const tokens = body.data?.tokens ?? body.tokens;
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  test("07 organization page view and update", async ({ page }) => {
    await sidebarGoto(page, "Organization");
    await expect(page.getByRole("heading", { name: "Organization Administration" })).toBeVisible();
    const nameField = page.getByLabel("Name");
    await expect(nameField).toBeVisible();
    const updatedName = `${orgName} Updated`;
    await nameField.fill(updatedName);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Organization updated.")).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue(updatedName);
  });

  test("08 invite member and capture token", async ({ page }) => {
    await sidebarGoto(page, "Invitations");
    await expect(page.getByRole("heading", { name: "Invite Member" })).toBeVisible();
    await page.getByLabel("Invitee Email").fill(inviteeEmail);
    await page.getByLabel("Role").selectOption("MEMBER");
    await page.getByRole("button", { name: "Send Invitation" }).click();
    await expect(page.getByText("Invitation created.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("invitation-token")).toBeVisible({ timeout: 10_000 });
    invitationToken = (await page.getByTestId("invitation-token").innerText()).trim();
    expect(invitationToken.length).toBeGreaterThan(10);
  });

  test("09 members and memberships pages load", async ({ page }) => {
    await sidebarGoto(page, "Members");
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await page.goto("/memberships");
    await expect(page.getByRole("heading", { name: "Memberships" })).toBeVisible();
  });

  test("10 settings profile update", async ({ page }) => {
    await sidebarGoto(page, "Settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByLabel("Job Title").fill("RC QA Engineer");
    await page.getByLabel("Timezone").fill("UTC");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText("Profile updated.")).toBeVisible({ timeout: 15_000 });
  });

  test("11 seed ad account and create/edit/delete campaign", async ({ page, request }) => {
    const login = await apiLogin(request, ownerEmail, password);
    await seedAdAccount(request, login.tokens.accessToken);

    await sidebarGoto(page, "Campaigns");
    await expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible();
    await page.getByRole("button", { name: "Create Campaign" }).first().click();
    await page.getByLabel("Ad Account").selectOption({ index: 1 });
    const campaignName = `RC Campaign ${Date.now()}`;
    await page.getByLabel("Name", { exact: true }).fill(campaignName);
    await page.locator("form").getByRole("button", { name: "Create Campaign" }).click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+/, { timeout: 30_000 });
    campaignId = page.url().split("/").pop() ?? "";
    expect(campaignId).toBeTruthy();

    await page.getByLabel("Name", { exact: true }).fill(`${campaignName} Edited`);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText(/updated|Campaign updated/i).first()).toBeVisible({ timeout: 15_000 });

    await sidebarGoto(page, "Campaigns");
    await page.getByPlaceholder(/Search/i).fill("Edited");
    await expect(page.getByText(`${campaignName} Edited`)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: `${campaignName} Edited` }).first().click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page).toHaveURL(/\/campaigns$/, { timeout: 20_000 });
  });

  test("12 campaign generator validation and empty ad account handling", async ({ page }) => {
    await sidebarGoto(page, "Campaign Generator");
    await expect(page.getByRole("heading", { name: "Campaign Generator" })).toBeVisible();
    await page.getByRole("button", { name: "Generate Campaign" }).click();
    await expect(page.getByText(/required|Select|Product/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("13 AI Copy page loads with campaign options", async ({ page }) => {
    await sidebarGoto(page, "AI Copy");
    await expect(page.getByRole("heading", { name: "AI Copy" })).toBeVisible();
    await expect(page.getByLabel("Campaign")).toBeVisible();
  });

  test("14 publisher page loads", async ({ page }) => {
    await sidebarGoto(page, "Publisher");
    await expect(page.getByRole("heading", { name: "Publisher" })).toBeVisible();
  });

  test("15 synchronization page loads", async ({ page }) => {
    await sidebarGoto(page, "Synchronization");
    await expect(page.getByRole("heading", { name: "Synchronization" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Synchronization" })).toBeVisible();
  });

  test("16 automation workflows and runs", async ({ page }) => {
    await sidebarGoto(page, "Automation");
    await expect(page.getByRole("heading", { name: "Automation Workflows" })).toBeVisible();
    await sidebarGoto(page, "Automation Runs");
    await expect(page.getByRole("heading", { name: /Automation Runs|Runs/i })).toBeVisible();
  });

  test("17 analytics dashboard and export controls", async ({ page }) => {
    await sidebarGoto(page, "Analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  });

  test("18 shopify connections page loads (OAuth not completed in RC)", async ({ page }) => {
    await sidebarGoto(page, "Shopify");
    await expect(page.getByRole("heading", { name: "Shopify Connections" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Store" })).toBeVisible();
  });

  test("19 accept invitation as new user", async ({ page }) => {
    test.skip(!invitationToken, "No invitation token available");
    await logoutViaUi(page);
    await registerViaUi(page, {
      organizationName: `Invitee Org ${Date.now()}`,
      email: inviteeEmail,
      firstName: "RC",
      lastName: "Invitee",
      password,
    });
    await page.goto("/invitations");
    await page.getByLabel("Invitation Token").fill(invitationToken);
    await page.getByRole("button", { name: "Accept Invitation" }).click();
    await expect(page.getByText(/accepted|Invitation accepted/i)).toBeVisible({ timeout: 20_000 });
  });

  test("20 protected route after logout", async ({ page }) => {
    await logoutViaUi(page);
    await page.goto("/campaigns");
    await expect(page).toHaveURL(/\/(unauthorized|login)/, { timeout: 20_000 });
  });

  test("21 no critical console errors on dashboard happy path", async ({ page }) => {
    await loginViaUi(page, ownerEmail, password);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const critical = consoleErrors.filter(
      (entry) =>
        !entry.includes("Download the React DevTools") &&
        !entry.includes("favicon") &&
        !entry.toLowerCase().includes("hydration"),
    );
    expect(critical, critical.join("\n")).toEqual([]);
  });
});
