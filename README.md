# n8n-nodes-gbp-peak

[n8n](https://n8n.io) community-node source for [GBP Peak](https://gbppeak.com): sampled Google Maps visibility, saved scan history, keyword trends and stored AI-visibility results. Maintained by GBP Peak.

## Availability and local build

This is a source preview for self-hosted n8n. As of October 15, 2026, `n8n-nodes-gbp-peak` is **not available in the public npm registry**. Do not use the Community Nodes registry installer for this package yet. n8n Cloud availability has not been verified.

Build and test a local package with a Node.js version supported by your n8n installation:

```sh
git clone https://github.com/Peakdrum/n8n-nodes-gbp-peak.git
cd n8n-nodes-gbp-peak
npm ci
npm test
npm pack
```

`npm pack` builds the node and includes its icon, then produces `n8n-nodes-gbp-peak-0.1.0.tgz`. On a separate test n8n instance, copy that tarball into the instance and install it from the n8n user's `~/.n8n/nodes` directory:

```sh
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install /absolute/path/to/n8n-nodes-gbp-peak-0.1.0.tgz
```

Restart the test instance, then search for **GBP Peak** in the node picker. In Docker, the tarball path must be accessible **inside the container**. Do not replace a production installation without a backup and compatibility checks. See n8n's [manual installation guidance](https://docs.n8n.io/integrations/community-nodes/installation-and-management/manual-installation/).

`npm test` runs offline tests with synthetic responses. Passing them does not prove live API access, compatibility with every n8n version, or a paid scan's result.

## Credentials

Create an API token at **gbppeak.com → Settings → AI access** and save it as a **GBP Peak API** credential in n8n. A GBP Peak account is required. The credential test lists saved locations; it does not trigger a scan. Keep API tokens out of workflow exports, screenshots and source control.

## Resources and operations

| Resource | Operations |
|---|---|
| Location | List saved locations |
| Scan | Trigger scan, get a scan, list scan history, cancel the account's scan queue |
| Keyword Ranks | Read keyword/location trends |
| AI Run (GEO) | List or get stored AI answer-engine runs |

See the [GBP Peak API documentation](https://gbppeak.com/api-docs) for response fields, limits and account requirements. Reads return stored results, not a new measurement. Scan points represent sampled positions, not every location on the map; visibility is not evidence of leads, revenue or guaranteed rankings.

### Start with a read-only workflow

Use **Manual Trigger → GBP Peak (Scan / List scans)** with a small limit. Inspect measurement dates and statuses before using results in a report. An empty response means no matching stored results; it is not a zero-rank measurement. Do not describe old or incomplete results as current visibility.

Only add a reporting destination after inspecting the response, and remove customer identifiers before sharing a demonstration. This repository does not yet contain a verified end-to-end customer reporting workflow.

### Triggering a scan spends credits only after confirmation

1. Choose **Scan / Trigger scan**, a saved location and comma-separated keywords.
2. Leave **Confirm** off. For an otherwise valid request, the API rejects execution with `confirm_required` and a cost preview. This is an expected error, not a completed scan. Other validation or balance errors may happen first.
3. Review the preview and your available credits. Only enable **Confirm** if you intend to spend those credits, then run once.
4. Creation returns a **queue ID, not a scan ID**. Do not pass that value to **Get scan**. Use **List scans**, filtered by location and keyword, to inspect stored scan IDs, dates and statuses. Exact queue-to-scan correlation is not supplied by this node; do not treat an unrelated or older result as the new request's result. Once the intended scan is identified, use its scan ID with **Get scan**. Use bounded polling; a fixed wait alone does not prove completion. Do not automatically retry a confirmed create request after a timeout, as it may already have been accepted.

**Cancel scan queue** affects the account's pending/running scans, not just a selected scan ID. Do not expose confirmed scan creation or queue cancellation to unattended AI tools without your own approval controls.

## License

[MIT](LICENSE)
