# Ace Data Cloud Face Transform for FastGPT

Analyze a permitted portrait in a FastGPT workflow. The same plugin offers beautify, age transform, gender transform, swap, cartoon, and liveness actions. [简体中文](README_zh_CN.md) · [Current pricing](https://platform.acedata.cloud/models)

Use only images you own or are authorized to process. These APIs are in Alpha and their output may change. A liveness result is an image signal, not identity proof.

## Quick start

### 1. Install

Use FastGPT 4.15 or later. Once published, search FastGPT Marketplace for **Ace Data Cloud Face Transform** and confirm the author is **Ace Data Cloud**. Before listing, a business or self-hosted administrator can build and upload this repository's .pkg. FastGPT Cloud does not currently allow direct custom plugin uploads.

### 2. Get the correct key

Sign in to [Ace Data Cloud → Applications](https://platform.acedata.cloud/console/applications), open **General Application**, and check **Face Transform** access, balance, and current price. Copy the key with icon **1** below; or use **2 Manage Keys → Create** for a separate FastGPT key. If **Allowed APIs** is enabled, allow the action paths you plan to use: /face/analyze, /face/beautify, /face/change-age, /face/change-gender, /face/swap, /face/cartoon, and /face/detect-live.

![Actual Ace Data Cloud application screen with the key redacted](assets/get-api-key-en.png)

In FastGPT's plugin configuration, paste the token into **Ace Data Cloud API key**. Do not add Bearer, quotes, or the redacted characters in the screenshot. Never put the key in a prompt or workflow export.

### 3. Analyze the first portrait

In **Studio → Create Agent → Workflow**, start with **Process starts**. From **System Tools**, add **Ace Data Cloud Face Transform**, activate it with the configured **System secret**, and connect **Process starts → Ace Data Cloud Face Transform → Basic / Assigned Reply**. Set:

| Field | First-run value |
|---|---|
| Action | keypoints |
| Analyze mode | 1 (largest face) |
| Image URL | https://platform2.cdn.acedata.cloud/seedream/00355681-7e81-49a4-a8fc-d2165fe1e9fd.jpg |

This is a fictional previously generated test portrait. You can replace it with your own authorized, accessible HTTPS image URL. Leave other fields empty. In **Assigned Reply**, insert **success**, **faceCount**, **data**, **costCredits**, and **traceId** with the variable picker. Choose **Save Only**, then **Run Preview** once. A detected face should produce faceCount at least 1 and structured keypoints in data. This synchronous tool has no task ID or polling node.

Check the matching Ace Data Cloud request record and Credits charge. A successful HTTP response does not guarantee a face is present; faceCount may be 0.

The screenshots below show an installed plugin and **one new FastGPT-hosted call** in Run Preview.

![Installed plugin with Normal status and Configured system key](assets/fastgpt-installed-configured.png)

![New FastGPT-hosted call and its result](assets/fastgpt-host-result.png)

### 4. Copyable local example without a key in the repository

[examples/analyze.json](examples/analyze.json) contains no credentials. Create a local .secrets.local.json with {"apiKey":"YOUR_OWN_KEY"} and run:

~~~sh
pnpm install
pnpm exec fastgpt-plugin debug . --run --input-file examples/analyze.json --secrets-file .secrets.local.json
pnpm exec fastgpt-plugin build --entry . --output ./dist
pnpm exec fastgpt-plugin check --entry . --output ./dist
pnpm exec fastgpt-plugin pack --entry . --dist ./dist --output ./out
~~~

The secret file is ignored by Git. Do not publish it or a screenshot of it.

## Other actions

| Action | Required input | Effect |
|---|---|---|
| beautify | Image URL | Optional smoothing, whitening, face lifting, and eye enlarging, each 0–100. |
| age | Image URL, Target age | One target age for one face. |
| gender | Image URL, Target gender | 0 male to female; 1 female to male. |
| swap | Source face image URL, Target image URL | Put the source face on the target image. Both require permission. |
| cartoon | Image URL | Return a cartoon result image. |
| liveness | Image URL | Analyze a single image for liveness signs; do not use alone for identity decisions. |

Each action is a distinct API call and may be billed. Swap runs synchronously with a 90-second request timeout; if it times out, inspect request history before retrying.

## Troubleshooting

| What you see | What to do |
|---|---|
| 401 / 403 | Check key, expiration, Face access, Allowed APIs, and balance. |
| 400 | Check that the chosen action has its required inputs, valid HTTPS images, and supported values. |
| faceCount 0 | Try a clearer front-facing portrait; do not treat a result as proof of identity. |
| 429 | Wait and lower concurrency. |
| timeout / 5xx | Inspect the original request history before retrying an uncertain paid operation. Give support the trace ID when available, never your key. |

The plugin sends the chosen image URL and settings with the key to api.acedata.cloud. Calls follow [current pricing](https://platform.acedata.cloud/models). [Privacy](PRIVACY.md) · [Source and support](https://github.com/AceDataCloud/FaceTransformFastGPT/issues).
