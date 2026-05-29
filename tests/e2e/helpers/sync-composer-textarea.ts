import type { Locator } from "@playwright/test";

/** Native setter + input/change events so cold-hydration React composer state catches up. */
export async function syncComposerTextarea(textarea: Locator, value: string) {
  await textarea.click({ timeout: 5_000 }).catch(() => undefined);
  await textarea.fill("");
  if (value === "") {
    await textarea.evaluate((el) => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      window.dispatchEvent(new CustomEvent("dreamos:composer-sync"));
    });
    return;
  }
  // Controlled React textarea: fill alone leaves state/dom/live-len out of sync; type like a user.
  await textarea.pressSequentially(value, { delay: 8 });
  await textarea.evaluate((el, text) => {
    if (!(el instanceof HTMLTextAreaElement)) return;
    if (el.value !== text) {
      const proto = window.HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      descriptor?.set?.call(el, text);
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          data: text,
          inputType: "insertFromPaste",
        }),
      );
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    window.dispatchEvent(new CustomEvent("dreamos:composer-sync"));
  }, value);
}
