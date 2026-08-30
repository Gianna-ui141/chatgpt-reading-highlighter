# ChatGPT Reading Highlighter

A local-first Chrome/Edge extension for a two-pass reading workflow in ChatGPT: skim once and leave highlights, then return to the passages that mattered.

## Features

- Four highlight colors
- Optional notes attached to passages
- Per-conversation annotation panel with search
- Jump back to the source response
- Persistent restoration after reloads and dynamic page rendering
- Markdown and JSON export
- Local-only storage; no account, analytics, or external server

## Install locally

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select this repository folder.
6. Reload `https://chatgpt.com`.

Select text inside an assistant response. Choose a color or **＋旁注** from the floating toolbar. Use the ✦ button at the lower right to open the annotation panel.

## Privacy

The extension requests only:

- `storage`, to keep annotations in the browser
- `activeTab`, to open the annotation panel when you click the extension icon
- access to `https://chatgpt.com/*`, to render highlights on ChatGPT

It does not request cookies, browsing history, tabs, passwords, or access to other sites. It does not send content to an AI provider or external server.

## Development

No build step or dependencies are required.

```bash
npm test
npm run check
```

After editing, reload the extension from `chrome://extensions`.

## Current limitations

- ChatGPT can change its page structure; the extension uses several identity and text-context fallbacks, but major UI changes may require selector updates.
- Highlights are stored only in the current browser profile. Export JSON for backup.
- The first release targets Chromium browsers and `chatgpt.com`.

## License

MIT
