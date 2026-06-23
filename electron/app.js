import { appState } from "./state.js";
import { render, escapeHtml } from "./render.js";
import { bindEvents } from "./handlers.js";

startApp();

async function startApp() {
  try {
    appState.data = await window.noticeboardAPI.getData();
    appState.settings = await window.noticeboardAPI.getSettings();

    bindEvents();
    render();
  } catch (error) {
    document.body.innerHTML = `<pre style="color:#e8dac0;padding:24px;white-space:pre-wrap;">Failed to load generator data.\n\n${escapeHtml(error.stack ?? error.message)}</pre>`;
  }
}
