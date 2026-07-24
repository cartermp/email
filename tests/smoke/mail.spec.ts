import { expect, test } from "@playwright/test";

test("serves the themed favicon without an auth redirect", async ({
  request,
}) => {
  const response = await request.get("/icon.svg");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
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
