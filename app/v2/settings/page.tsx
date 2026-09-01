import { getSettingsFacts } from "./settings-data";
import SettingsOverview from "./settings-overview";

// /v2/settings - the hub the old settings never had. The live /settings
// redirects straight into the Discord bot page, so this is the first screen that
// answers "what can I configure, and where does each thing live".
//
// The facts are read here and handed down, which keeps the database out of the
// client bundle: settings-index.ts is the pure half both sides import.

export default async function V2SettingsPage() {
  const facts = await getSettingsFacts();
  return <SettingsOverview facts={facts} />;
}
