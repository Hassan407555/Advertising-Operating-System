import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_BASE = process.env.RC_API_BASE_URL ?? "http://localhost:3001/api";
const TOKEN_KEY = "aos.session.tokens";

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

async function registerViaUi(
  page: Page,
  data: {
    organizationName: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  },
) {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
  await page.getByLabel("Organization Name").fill(data.organizationName);
  await page.getByLabel("First Name").fill(data.firstName);
  await page.getByLabel("Last Name").fill(data.lastName);
  await page.getByLabel("Email").fill(data.email);
  await page.getByLabel("Password").fill(data.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expectDashboard(page);
}

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function logoutViaUi(page: Page) {
  await page.locator("header details summary").click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
}

async function readStoredTokens(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as { accessToken?: string; refreshToken?: string };
    } catch {
      return null;
    }
  }, TOKEN_KEY);
}

async function expectAuthenticatedShell(page: Page) {
  await expect(page).toHaveURL(/\/(dashboard|settings|campaigns|organization)/);
  await expect(page.getByLabel("Sidebar")).toBeVisible();
  await expect(page.locator("header details summary")).toBeVisible();
}

async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Welcome to Advertising OS" })).toBeVisible({
    timeout: 20_000,
  });
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

test.describe("Authentication journey", () => {
  const password = "Password1";
  const email = uniqueEmail("auth-qa");
  const organizationName = `Auth QA Org ${Date.now()}`;
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });
  });

  test("01 unauthenticated landing redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });

  test("02 protected route redirects unauthenticated users", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(unauthorized|login)/, { timeout: 30_000 });
  });

  test("03 register creates account, session tokens, and dashboard access", async ({ page }) => {
    await page.context().clearCookies();
    const registerResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/auth/register") && response.request().method() === "POST",
    );

    await registerViaUi(page, {
      organizationName,
      email,
      firstName: "Auth",
      lastName: "Owner",
      password,
    });

    const registerResponse = await registerResponsePromise;
    expect(registerResponse.ok()).toBeTruthy();

    await expectDashboard(page);
    await expect(page.getByText(/Signed in as Auth Owner/i)).toBeVisible();

    const tokens = await readStoredTokens(page);
    expect(tokens?.accessToken).toBeTruthy();
    expect(tokens?.refreshToken).toBeTruthy();

    const cookie = await page.context().cookies();
    expect(cookie.some((entry) => entry.name === "aos.access-token" && entry.value.length > 0)).toBeTruthy();
  });

  test("04 browser refresh keeps authenticated session", async ({ page }) => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectDashboard(page);
    const tokens = await readStoredTokens(page);
    expect(tokens?.accessToken).toBeTruthy();
  });

  test("05 protected page remains accessible while authenticated", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 20_000 });
    await expectAuthenticatedShell(page);
  });

  test("06 logout clears session and blocks protected routes", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await logoutViaUi(page);

    const tokens = await readStoredTokens(page);
    expect(tokens).toBeNull();

    const cookies = await page.context().cookies();
    expect(cookies.some((entry) => entry.name === "aos.access-token" && entry.value)).toBeFalsy();

    await page.goto("/campaigns", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(unauthorized|login)/, { timeout: 30_000 });
  });

  test("07 login restores session", async ({ page }) => {
    const loginResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/auth/login") && response.request().method() === "POST",
    );
    await loginViaUi(page, email, password);
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBeTruthy();
    await expectDashboard(page);

    const tokens = await readStoredTokens(page);
    expect(tokens?.accessToken).toBeTruthy();
    expect(tokens?.refreshToken).toBeTruthy();
  });

  test("08 invalid credentials show error and stay on login", async ({ page }) => {
    await logoutViaUi(page);
    await loginViaUi(page, email, "WrongPass1");
    await expect(page.getByText(/unable to login|invalid email or password/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login/);
    expect(await readStoredTokens(page)).toBeNull();
  });

  test("09 duplicate registration is rejected", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Organization Name").fill(`${organizationName} Dup`);
    await page.getByLabel("First Name").fill("Auth");
    await page.getByLabel("Last Name").fill("Owner");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page.getByText(/already registered|already in use|unable to register/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/register/);
  });

  test("10 invalid refresh token is rejected by API", async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: "invalid.token.value" },
    });
    expect(response.status()).toBe(401);
  });

  test("11 refresh after logout is rejected", async ({ request }) => {
    const login = await apiLogin(request, email, password);
    const logout = await request.post(`${API_BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${login.tokens.accessToken}` },
    });
    expect(logout.ok()).toBeTruthy();

    const refresh = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: login.tokens.refreshToken },
    });
    expect(refresh.status()).toBe(401);
  });

  test("12 client validation blocks empty login submit", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/invalid email|required|at least/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("13 no critical auth console errors on successful login", async ({ page }) => {
    await loginViaUi(page, email, password);
    await expectDashboard(page);
    const critical = consoleErrors.filter(
      (entry) =>
        !entry.includes("Download the React DevTools") &&
        !entry.includes("favicon") &&
        !entry.toLowerCase().includes("hydration"),
    );
    expect(critical, critical.join("\n")).toEqual([]);
  });
});
