import { expect, test } from "@playwright/test";

const PLATE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGN4FmUDRAwQCgAsRgXx6yQjjQAAAABJRU5ErkJggg==",
  "base64",
);

test("a guest cooks a recipe end to end and a reload resumes mid-cook", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.getByRole("link", { name: /Garlic & Basil Pomodoro/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Garlic & Basil Pomodoro" })).toBeVisible();
  await page.getByRole("link", { name: "Cook this" }).click();

  await expect(page.getByRole("heading", { name: "Get everything out first." })).toBeVisible();
  await page.getByRole("button", { name: /yellow onion/ }).click();
  await expect(page.getByRole("button", { name: /yellow onion/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Start cooking/ }).click();

  await expect(page.getByText("Step 1 of 10")).toBeVisible();
  await page.getByRole("button", { name: /^Start timer/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 2 of 10")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Timers" })).toContainText("Water to a boil");

  await page.reload();
  await expect(page.getByText("Step 2 of 10")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Timers" })).toContainText("Water to a boil");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Step 3 of 10")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Step 2 of 10")).toBeVisible();

  for (let step = 2; step < 10; step++) {
    await page.getByRole("button", { name: /^(Next|Skip ahead anyway)$/ }).click();
    await expect(page.getByText(`Step ${step + 1} of 10`)).toBeVisible();
  }
  await page.getByRole("button", { name: "Done cooking" }).click();

  await expect(page.getByRole("heading", { name: "Take a photo of your plate." })).toBeVisible();
  await page.getByLabel("Photo of your dish").setInputFiles({ name: "plate.png", mimeType: "image/png", buffer: PLATE });
  await expect(page.getByRole("img", { name: "Your Garlic & Basil Pomodoro" })).toBeVisible();
  await page.getByRole("button", { name: "Use this photo" }).click();

  await page.getByRole("radio", { name: /Really good/ }).click();
  await page.getByLabel("One note for next time").fill("More basil.");
  await page.getByRole("button", { name: "Save this cook" }).click();
  await expect(page.getByText("Session logged")).toBeVisible();
  await expect(page.getByText("Photo saved")).toBeVisible();
  await expect(page.getByText(/reads as a walkthrough/)).toBeVisible();
  await page.getByRole("link", { name: "Done", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByRole("link", { name: /^History/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What you have cooked");
  await expect(page.getByText("Garlic & Basil Pomodoro")).toBeVisible();
  await expect(page.getByText("More basil.")).toBeVisible();

  await page.getByRole("link", { name: "Garlic & Basil Pomodoro" }).click();
  const photo = page.getByRole("img", { name: "Your Garlic & Basil Pomodoro" });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2);
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("No photo of this one yet.")).toBeVisible();
});

test("a member imports a pasted recipe, saves it, and deletes it", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel(/name/i).fill("E2E Cook");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("e2e-only-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  await page.goto("/recipes/new");
  await page.getByLabel("Recipe text").fill(
    [
      "E2E Garlic Noodles",
      "",
      "Ingredients",
      "200 g spaghetti",
      "3 cloves garlic, minced",
      "2 tbsp butter",
      "",
      "Instructions",
      "1. Boil the spaghetti for 9 minutes until tender, then drain.",
      "2. Saute the garlic in the butter over medium heat for 1 minute until fragrant.",
      "3. Toss the spaghetti with the garlic butter and serve.",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Turn into steps" }).click();

  const editor = page.getByRole("form", { name: "New recipe" });
  await expect(editor).toBeVisible();
  await expect(editor.locator("svg").first()).toBeVisible();
  await editor.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "E2E Garlic Noodles" })).toBeVisible();
  await page.goto("/my");
  await expect(page.getByRole("link", { name: /E2E Garlic Noodles/ }).first()).toBeVisible();

  await page.getByRole("link", { name: /E2E Garlic Noodles/ }).first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete recipe" }).click();
  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByRole("link", { name: /E2E Garlic Noodles/ })).toHaveCount(0);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("cooking mode renders every station without errors or running animations", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/stage-lab");
    await expect(page.locator("svg").first()).toBeVisible();
    // The stage reads the motion preference after hydration, so loops may start and then stop.
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length))
      .toBe(0);
    expect(errors).toEqual([]);
  });
});

test("tapping a technique explains it, and the bottom bar reaches Cook and Profile", async ({ page }) => {
  await page.goto("/cook");
  await expect(page.getByRole("heading", { level: 1, name: "What are you making?" })).toBeVisible();
  await page.getByRole("searchbox").fill("pomodoro");
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /Garlic & Basil Pomodoro/ }).first().click();
  await page.getByRole("link", { name: "Cook this" }).click();
  await page.getByRole("button", { name: /^Start cooking/ }).click();

  await page.getByRole("button", { name: /^Boil/ }).click();
  const sheet = page.getByRole("dialog", { name: "Boil" });
  await expect(sheet).toContainText("bubbling hard");
  await sheet.getByRole("button", { name: "Got it" }).click();
  await expect(sheet).toBeHidden();

  await page.goto("/profile");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Techniques", { exact: true }).first()).toBeVisible();
});
