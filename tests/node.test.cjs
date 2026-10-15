"use strict";

// Execute the compiled node with the real n8n SDK; only context/HTTP are synthetic.
const assert = require("node:assert/strict");
const test = require("node:test");
const { NodeApiError, NodeOperationError } = require("n8n-workflow");
const { GbpPeak } = require("../dist/nodes/GbpPeak/GbpPeak.node.js");
const loadNode = () => new GbpPeak();

function fixture({ resource = "scan", operation = "list", parameters = {}, responses = [], failure, inputCount = 1, continueOnFail = false } = {}) {
  const calls = [];
  const defaults = { locationId: 7, keywords: "coffee shop", gridMode: "square", gridSize: 5,
    radiusKm: 1, confirm: false, limit: 20, locationIdNumber: 0, keywordFilter: "", scanId: 42,
    geoRunId: 9, geoRunLimit: 20 };
  const context = {
    getInputData: () => Array.from({ length: inputCount }, () => ({ json: {} })),
    getNodeParameter(name, index) {
      if (name === "resource") return resource;
      if (name === "operation") return operation;
      const value = parameters[name] ?? defaults[name];
      return Array.isArray(value) ? value[index] : value;
    },
    getNode: () => ({ id: "synthetic", name: "GBP Peak", type: "gbpPeak", typeVersion: 1, position: [0, 0], parameters: {} }),
    continueOnFail: () => continueOnFail,
    getCredentials: () => { throw new Error("Use the credential helper"); },
    helpers: {
      request: () => { throw new Error("Bare request forbidden"); },
      httpRequestWithAuthentication: async function (credentialType, options) {
        calls.push({ context: this, credentialType, options });
        if (failure) throw failure;
        return responses[calls.length - 1] ?? {};
      },
    },
  };
  return { context, calls };
}

test("location options use the saved credential helper", async () => {
  const f = fixture({ responses: [{ locations: [{ id: 7, label: "Synthetic location" }] }] });
  const result = await loadNode().methods.loadOptions.getLocationIds.call(f.context);
  assert.deepEqual(result, [{ name: "Synthetic location", value: 7 }]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].context, f.context);
  assert.equal(f.calls[0].credentialType, "gbpPeakApi");
  assert.equal(f.calls[0].options.method, "GET");
  assert.equal(f.calls[0].options.url, "https://gbppeak.com/api/v1/locations");
});

for (const [resource, operation, suffix] of [
  ["location", "list", "/locations"], ["scan", "get", "/scans/42"],
  ["scan", "list", "/scans"], ["keywordRanks", "trends", "/keyword-ranks"],
  ["geoRun", "get", "/geo-runs/9"], ["geoRun", "list", "/geo-runs"],
]) {
  test(resource + "/" + operation + " reads through authenticated HTTP", async () => {
    const f = fixture({ resource, operation, responses: [[{ id: 1 }, { id: 2 }]] });
    const result = await loadNode().execute.call(f.context);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].context, f.context);
    assert.equal(f.calls[0].credentialType, "gbpPeakApi");
    assert.equal(f.calls[0].options.method, "GET");
    assert.equal(f.calls[0].options.url, "https://gbppeak.com/api/v1" + suffix);
    assert.deepEqual(result[0].map(item => item.pairedItem), [{ item: 0 }, { item: 0 }]);
  });
}

test("history filters and multi-input pairing are preserved", async () => {
  const f = fixture({ inputCount: 2, parameters: { locationIdNumber: [7, 8], keywordFilter: ["coffee", "bakery"], limit: 5 },
    responses: [[{ id: 11 }, { id: 12 }], { id: 13 }] });
  const result = await loadNode().execute.call(f.context);
  assert.deepEqual(f.calls.map(call => call.options.qs), [
    { limit: 5, locationId: 7, keyword: "coffee" }, { limit: 5, locationId: 8, keyword: "bakery" },
  ]);
  assert.deepEqual(result[0].map(item => item.pairedItem.item), [0, 0, 1]);
});

test("only explicit scan/cancel issues DELETE", async () => {
  const f = fixture({ operation: "cancel" });
  await loadNode().execute.call(f.context);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].options.method, "DELETE");
  assert.equal(f.calls[0].options.url, "https://gbppeak.com/api/v1/scans");
});

for (const [resource, operation] of [
  ["scan", "delete"], ["location", "delete"], ["keywordRanks", "list"],
  ["geoRun", "cancel"], ["unknown", "list"],
]) {
  test(resource + "/" + operation + " fails without any HTTP request", async () => {
    const f = fixture({ resource, operation });
    await assert.rejects(() => loadNode().execute.call(f.context),
      error => error instanceof NodeOperationError && /Unsupported/.test(error.message));
    assert.equal(f.calls.length, 0);
  });
}

const preview = { code: "confirm_required", error: "Exact cost: 25 scan points" };
for (const [name, failure] of [
  ["response body", { response: { body: preview } }],
  ["response data", { response: { data: preview } }],
  ["JSON body", { response: { body: JSON.stringify(preview) } }],
  ["JSON data", { response: { data: JSON.stringify(preview) } }],
  ["direct body", { body: preview }],
  ["top level", preview],
]) {
  test("confirmation preview from " + name + " never retries", async () => {
    const f = fixture({ operation: "create", parameters: { confirm: false }, failure });
    await assert.rejects(() => loadNode().execute.call(f.context), error => {
      assert.ok(error instanceof NodeOperationError);
      assert.match(error.message, /25 scan points/);
      assert.match(error.message, /review the cost and available credits/);
      return true;
    });
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].options.method, "POST");
    assert.equal(f.calls[0].options.body.confirm, false);
  });
}

test("confirmed creation runs once and preserves the queueId response", async () => {
  const f = fixture({ operation: "create", parameters: { confirm: true, keywords: "coffee, bakery" }, responses: [{ queueId: 123 }] });
  const output = await loadNode().execute.call(f.context);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].options.body.confirm, true);
  assert.deepEqual(f.calls[0].options.body.keywords, ["coffee", "bakery"]);
  assert.deepEqual(output[0][0].json, { queueId: 123 });
  assert.equal(loadNode().description.properties.find(p => p.name === "confirm").default, false);
});

test("a transport failure is not retried, including confirmed creation", async () => {
  const f = fixture({ operation: "create", parameters: { confirm: true }, failure: new Error("Synthetic timeout") });
  await assert.rejects(() => loadNode().execute.call(f.context), error => error instanceof NodeApiError);
  assert.equal(f.calls.length, 1);
});

test("continue-on-fail preserves item identity without issuing unknown operations", async () => {
  const f = fixture({ operation: "unknown", inputCount: 2, continueOnFail: true });
  const result = await loadNode().execute.call(f.context);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(result[0].map(item => item.pairedItem.item), [0, 1]);
  assert.ok(result[0].every(item => /Unsupported/.test(item.json.error)));
});

test("empty keywords fail locally", async () => {
  const f = fixture({ operation: "create", parameters: { keywords: " , " } });
  await assert.rejects(() => loadNode().execute.call(f.context), /at least one keyword/);
  assert.equal(f.calls.length, 0);
});
