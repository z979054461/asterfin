import { createInstance } from "i18next";
import en from "@/translations/en.json";
import { getIntroCopy } from "./intro";

test("keeps translation catalogues unchanged while rebranding welcome copy", async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: "en",
    resources: { en: { translation: en } },
  });
  const copy = getIntroCopy(i18n.t);
  expect(copy.welcome).toBe("Welcome to Asterfin");
  expect(copy.features).toContain("Asterfin");
  expect(copy.crashReportsTitle).toBe("Help improve Asterfin");
  expect(copy.crashReportsDescription).toContain("off by default");
  expect(en.home.intro.welcome_to_streamyfin).toBe("Welcome to Streamyfin");
});
