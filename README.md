# ChatGPT Reading Highlighter

A local-first Chrome/Edge extension for a two-pass reading workflow in ChatGPT: skim once and leave highlights, then return to the passages that mattered.

Current version: **0.2.0**

## Features

- Four highlight colors
- Optional notes attached to passages
- Per-conversation annotation panel with search
- Jump back to the source response
- Persistent restoration after reloads and dynamic page rendering
- Markdown and JSON export
- Local-only storage; no account, analytics, or external server
- Selection toolbar placement that avoids ChatGPT's native selection menu
- Automatic Chinese/English interface switching based on the browser language

## Language support

The extension automatically follows the browser language:

- Chinese browser locales (`zh-CN`, `zh-HK`, `zh-TW`, and related variants) display the Chinese interface.
- All other browser locales display the English interface by default.

This applies to the extension name and description, toolbar labels, annotation panel, prompts, timestamps, and Markdown exports. Existing highlights remain available when the display language changes.

## Install locally

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select this repository folder.
6. Reload `https://chatgpt.com`.

Select text inside an assistant response. Choose a color or **+ Note / ＋旁注** from the floating toolbar. Use the ✦ button at the lower right to open the annotation panel.

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
