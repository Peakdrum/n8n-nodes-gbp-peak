# n8n-nodes-gbp-peak

[n8n](https://n8n.io) community nodes for **[GBP Peak](https://gbppeak.com)** — Google Maps geo-grid rank scanning and local SEO data.

Run geo-grid scans, read rank maps and competitor stats, and pull keyword / AI-visibility trends straight into your n8n workflows. One API token covers the REST API, the MCP server and these nodes ([API docs](https://gbppeak.com/api-docs)).

## Install

**Community nodes (self-hosted n8n):** Settings → Community nodes → Install `n8n-nodes-gbp-peak`.

**Docker / CLI:**
```bash
cd ~/.n8n/nodes
npm install n8n-nodes-gbp-peak
```

## Credentials

Create an API token at **gbppeak.com → Settings → AI access** (starts with `gbpk_…`) and add it as a *GBP Peak API* credential. The credential has a built-in connection test.

## Resources & operations

| Resource | Operations |
|---|---|
| **Location** | List saved locations |
| **Scan** | Trigger scan (costs scan points — first run without `Confirm` returns the exact cost), Get scan (every grid point + competitors), List scan history (avg rank / top-3 / found stats), Cancel scan queue |
| **Keyword Ranks** | Get keyword × location trends with 7d / 30d / lifetime deltas |
| **AI Run (GEO)** | List AI answer-engine runs (ChatGPT, Gemini, Perplexity…), Get one full run |

### Trigger scan example

1. Set Resource = *Scan*, Operation = *Trigger scan*, pick a Location, enter comma-separated keywords.
2. Leave **Confirm** off for a dry run — the node returns the exact point cost.
3. Toggle **Confirm** on to execute.

## Example workflow

Schedule Trigger → **GBP Peak** (Trigger scan) → Wait → **GBP Peak** (Get scan) → Google Sheets (append daily rank log) or Slack (alert if avg rank drops).

The node is `usableAsTool`, so AI Agents in n8n can call it directly.

## What is GBP Peak?

GBP Peak scans Google Maps on a grid so you see your local pack position at every point on the map (grids up to 50×50), not one averaged rank. Includes competitor leaderboards, rank history, white-label reports and AI answer-engine visibility checks. Free public daily scans of Bangkok areas: [gbppeak.com/free-maps](https://gbppeak.com/free-maps). Plans from $29/month with a free trial.

## License

[MIT](LICENSE)
