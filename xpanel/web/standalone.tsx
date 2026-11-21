import { createRoot } from "react-dom/client";
import Panel from "./Panel";
import "@fontsource-variable/cairo";
import "./panel.css";

const host = document.getElementById("xpanel-root");
if (host) {
  createRoot(host).render(<Panel endpoint="api.php" csrf={host.dataset.csrf} logout="index.php" today={host.dataset.today} />);
}
