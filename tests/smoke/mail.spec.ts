import { expect, test } from "@playwright/test";

const testAvatarSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#24292f"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route("**/api/avatar?*", (route) =>
    route.fulfill({ status: 204 }),
  );
});

test("serves the themed favicon without an auth redirect", async ({
  request,
}) => {
  const response = await request.get("/icon.svg");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
});

test("loads sender artwork and falls back cleanly when it is unavailable", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.unroute("**/api/avatar?*");
  await page.route("**/api/avatar?*", (route) => {
    const domain = new URL(route.request().url()).searchParams.get("domain");
    return domain === "github.com"
      ? route.fulfill({
          status: 200,
          contentType: "image/svg+xml",
          body: testAvatarSvg,
        })
      : route.fulfill({ status: 204 });
  });

  await page.goto("/smoke-tests");

  const brandedAvatar = page.locator('[data-avatar-domain="github.com"]');
  await expect(brandedAvatar).toHaveAttribute("data-avatar-state", "loaded");
  await expect(brandedAvatar.locator("img")).toHaveCSS("opacity", "1");

  const fallbackAvatar = page.locator(
    '[data-avatar-domain="missing-brand.com"]',
  );
  await expect(fallbackAvatar).toHaveAttribute("data-avatar-state", "failed");
  await expect(fallbackAvatar).toContainText("NW");
  await expect(fallbackAvatar.locator("img")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("opens a conversation from a desktop click", async ({ page }) => {
  await page.goto("/smoke-tests");

  const conversation = page.locator(
    'a[href="/smoke-tests/thread/thread-maya"]',
  );
  await expect(conversation).toContainText("Quarterly plan");

  await conversation.click();
  await expect(page).toHaveURL("/smoke-tests/thread/thread-maya");
  await expect(
    page.getByRole("heading", {
      name: "Opened conversation thread-maya",
    }),
  ).toBeVisible();
});

test("replaces search with selection actions without shifting conversations", async ({
  page,
}) => {
  await page.goto("/smoke-tests");

  const conversation = page.locator(
    'a[href="/smoke-tests/thread/thread-maya"]',
  );
  const beforeTop = await conversation.evaluate(
    (element) => element.getBoundingClientRect().top,
  );

  await page
    .getByRole("button", { name: "Select conversation from GitHub" })
    .click();

  await expect(page.getByRole("searchbox", { name: "Search all mail" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel selection" })).toBeVisible();
  const selectedTop = await conversation.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(selectedTop).toBe(beforeTop);

  await page.getByRole("button", { name: "Cancel selection" }).click();
  await expect(page.getByRole("searchbox", { name: "Search all mail" })).toBeVisible();
  const restoredTop = await conversation.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(restoredTop).toBe(beforeTop);
});

test("fetches new mail in the background and pauses while offline", async ({
  page,
}) => {
  await page.goto("/smoke-tests?panel=auto-sync");
  await page.context().setOffline(true);

  await page.waitForTimeout(900);
  await expect(page.getByText("New mail arrived")).toHaveCount(0);

  await page.context().setOffline(false);
  await expect(page.getByText("New mail arrived")).toBeVisible();
});

test("moves through conversations with the keyboard", async ({ page }) => {
  await page.goto("/smoke-tests");

  const announcement = page.locator(
    '[aria-live="polite"][aria-atomic="true"]',
  );
  const firstRowSwipeActions = page.locator(
    '[data-swipe-actions="thread-maya"]',
  );

  await expect(firstRowSwipeActions).toHaveCSS("opacity", "0");

  await page.keyboard.press("j");
  await expect(announcement).toHaveText(
    "Selected conversation: Quarterly plan",
  );
  await expect(firstRowSwipeActions).toHaveCSS("opacity", "0");

  await page.keyboard.press("j");
  await expect(announcement).toHaveText(
    "Selected conversation: Release notes",
  );

  await page.keyboard.press("k");
  await expect(announcement).toHaveText(
    "Selected conversation: Quarterly plan",
  );

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/smoke-tests/thread/thread-maya");
});

test("keeps reply history intact while editing Markdown", async ({ page }) => {
  await page.goto("/smoke-tests?panel=reply");

  const subject = page.getByRole("textbox", { name: "Subject" });
  const editor = page.locator("textarea");

  await expect(subject).toHaveValue("Re: Quarterly plan");
  await expect(editor).toHaveValue(/^Thanks, Maya\.\s*$/);

  await editor.fill("Updated **reply**");
  await page.getByRole("button", { name: "Preview" }).click();

  const preview = page.frameLocator('iframe[title="Email preview"]');
  await expect(preview.locator("strong")).toHaveText("reply");

  await page.getByRole("button", { name: "Write" }).click();
  await page.getByRole("button", { name: "Show quoted text" }).click();
  await expect(editor).toHaveValue(/The revised plan is ready for review\./);
});

test("protects an edited reply from accidental navigation", async ({ page }) => {
  await page.goto("/smoke-tests?panel=reply");
  await page.locator("textarea").fill("A changed reply");

  let prompt = "";
  page.once("dialog", async (dialog) => {
    prompt = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "Attachments" }).click();

  await expect(page).toHaveURL(/panel=reply/);
  expect(prompt).toBe("Leave this message? Recent changes may not be saved.");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("link", { name: "Attachments" }).click();
  await expect(page.getByRole("heading", { name: "Historical message" })).toBeVisible();
});

test("shows historical spreadsheet attachments", async ({ page }) => {
  await page.goto("/smoke-tests?panel=attachments");

  await expect(page.getByText("March water bills.xlsx")).toBeVisible();
  await expect(page.getByText("tracking-logo.png")).toHaveCount(0);

  await page.getByText("March water bills.xlsx").click();
  const dialog = page.getByRole("dialog", {
    name: "March water bills.xlsx",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Download", exact: true }),
  ).toHaveAttribute("href", /blobId=blob-sheet/);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
});
