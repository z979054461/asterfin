import { pinCastFramework } from "./withGradleProperties";

jest.mock("expo/config-plugins", () => ({}));

test("TV Cast SDK uses the same compatible version as phone", () => {
  const result = pinCastFramework("buildscript {}\n");
  expect(result).toContain('ext.castFrameworkVersion = "22.3.1"');
  expect(pinCastFramework(result)).toBe(result);
});

test("preserves the phone plugin's explicit Cast version", () => {
  const source = 'buildscript { ext { castFrameworkVersion = "22.3.1" } }';
  expect(pinCastFramework(source)).toBe(source);
});
