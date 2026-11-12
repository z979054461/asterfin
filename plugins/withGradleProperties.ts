import type { ExpoConfig } from "expo/config";
import {
  AndroidConfig,
  type ConfigPlugin,
  withGradleProperties,
  withProjectBuildGradle,
} from "expo/config-plugins";

function setGradlePropertiesValue(
  config: ExpoConfig,
  key: string,
  value: string,
): ExpoConfig {
  return withGradleProperties(config, (exportedConfig) => {
    const props = exportedConfig.modResults;
    const keyIdx = props.findIndex(
      (item) => item.type === "property" && item.key === key,
    );
    const property: AndroidConfig.Properties.PropertiesItem = {
      type: "property",
      key,
      value,
    };

    if (keyIdx >= 0) {
      props.splice(keyIdx, 1, property);
    } else {
      props.push(property);
    }

    return exportedConfig;
  });
}

const withCustomGradleProperties: ConfigPlugin = (config) => {
  // Expo 52 is not setting this
  // https://github.com/expo/expo/issues/32558
  config = setGradlePropertiesValue(config, "android.enableJetifier", "true");

  // NDK version required by libmpv 1.0.0
  config = setGradlePropertiesValue(config, "ndkVersion", "29.0.14206865");

  // Increase memory
  config = setGradlePropertiesValue(
    config,
    "org.gradle.jvmargs",
    "-Xmx4096m -XX:MaxMetaspaceSize=1024m",
  );
  // Cast remains autolinked on TV even though the phone-only Cast UI plugin
  // is omitted. Pin its transitive SDK there too; the upstream "+" default
  // pulls MediaRouter requiring API 37 / AGP 9.1 beyond this Expo baseline.
  return withProjectBuildGradle(config, (project) => {
    project.modResults.contents = pinCastFramework(project.modResults.contents);
    return project;
  });
};

export default withCustomGradleProperties;

export function pinCastFramework(contents: string): string {
  if (/castFrameworkVersion\s*=/.test(contents)) return contents;
  return `${contents}\n// Keep phone and TV on the compatible Cast SDK.\next.castFrameworkVersion = "22.3.1"\n`;
}
