import {
  type ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
} from "expo/config-plugins";

/** Opt-in test flavor only. No team, credentials, or device IDs are configured. */
const withPersonalTeam: ConfigPlugin = (config) => {
  config = withEntitlementsPlist(config, (config) => {
    delete config.modResults["com.apple.developer.networking.wifi-info"];
    delete config.modResults["com.apple.security.application-groups"];
    delete config.modResults["aps-environment"];
    return config;
  });
  return withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = false;
    config.modResults.NSSupportsLiveActivitiesFrequentUpdates = false;
    delete config.modResults.StreamyfinDownloadsAppGroupIdentifier;
    return config;
  });
};

export default withPersonalTeam;
