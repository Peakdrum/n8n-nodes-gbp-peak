import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from "n8n-workflow";

const BASE_URL = "https://gbppeak.com/api/v1";

export class GbpPeak implements INodeType {
	description: INodeTypeDescription = {
		displayName: "GBP Peak",
		name: "gbpPeak",
		icon: "file:gbppeak.svg",
		group: ["input"],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description:
			"Google Maps geo-grid rank scanning and local SEO data from GBP Peak (gbppeak.com)",
		defaults: { name: "GBP Peak" },
		inputs: ["main"],
		outputs: ["main"],
		usableAsTool: true,
		credentials: [
			{
				name: "gbpPeakApi",
				required: true,
				displayOptions: { show: {} },
			},
		],
		properties: [
			{
				displayName: "Resource",
				name: "resource",
				type: "options",
				noDataExpression: true,
				options: [
					{ name: "Location", value: "location" },
					{ name: "Scan", value: "scan" },
					{ name: "Keyword Ranks", value: "keywordRanks" },
					{ name: "AI Run (GEO)", value: "geoRun" },
				],
				default: "scan",
			},

			// ---------- Location ----------
			{
				displayName: "Operation",
				name: "operation",
				type: "options",
				noDataExpression: true,
				displayOptions: { show: { resource: ["location"] } },
				options: [{ name: "List Saved Locations", value: "list" }],
				default: "list",
			},

			// ---------- Scan ----------
			{
				displayName: "Operation",
				name: "operation",
				type: "options",
				noDataExpression: true,
				displayOptions: { show: { resource: ["scan"] } },
				options: [
					{
						name: "Trigger Scan",
						value: "create",
						description:
							"Run a new geo-grid scan. Costs scan points; a first call without Confirm returns the exact cost.",
					},
					{ name: "Get Scan", value: "get", description: "One scan including every grid point and competitors" },
					{ name: "List Scans", value: "list", description: "Geo-grid rank scan history with avg rank / top-3 / found stats" },
					{ name: "Cancel Scan Queue", value: "cancel", description: "Cancel the running scan queue" },
				],
				default: "list",
			},
			{
				displayName: "Location ID",
				name: "locationId",
				type: "options",
				typeOptions: {
					loadOptionsMethod: "getLocationIds",
					loadOptionsDependsOn: [],
				},
				required: true,
				displayOptions: { show: { resource: ["scan"], operation: ["create"] } },
				default: "",
				description: "Saved location to scan around",
			},
			{
				displayName: "Location ID",
				name: "locationIdNumber",
				type: "number",
				displayOptions: { show: { resource: ["scan"], operation: ["get", "list"] } },
				default: 0,
				description: "Optional filter by saved location ID (0 = all)",
			},
			{
				displayName: "Keywords",
				name: "keywords",
				type: "string",
				displayOptions: { show: { resource: ["scan"], operation: ["create"] } },
				default: "",
				placeholder: "coffee shop, bakery, gym",
				required: true,
				description: "Comma-separated keywords (1–200)",
			},
			{
				displayName: "Grid Shape",
				name: "gridMode",
				type: "options",
				displayOptions: { show: { resource: ["scan"], operation: ["create"] } },
				options: [
					{ name: "Square", value: "square" },
					{ name: "Circle", value: "circle" },
				],
				default: "square",
			},
			{
				displayName: "Grid Size",
				name: "gridSize",
				type: "number",
				typeOptions: { minValue: 3, maxValue: 50, numberStep: 1 },
				displayOptions: { show: { resource: ["scan"], operation: ["create"] } },
				default: 5,
				description: "Points per side / diameter (3–50)",
			},
			{
				displayName: "Radius (km)",
				name: "radiusKm",
				type: "number",
				typeOptions: { minValue: 0.5, maxValue: 25, numberStep: 0.5 },
				displayOptions: { show: { resource: ["scan"], operation: ["create"] } },
				default: 1,
			},
			{
				displayName: "Confirm",
				name: "confirm",
				type: "boolean",
				displayOptions: { show: { resource: ["scan"], operation: ["create"] } },
				default: false,
				description:
					"Set true to actually run and spend scan points. When off, the API returns the exact cost as an error (confirm_required).",
			},
			{
				displayName: "Scan ID",
				name: "scanId",
				type: "number",
				required: true,
				displayOptions: { show: { resource: ["scan"], operation: ["get"] } },
				default: 0,
			},
			{
				displayName: "Keyword",
				name: "keywordFilter",
				type: "string",
				displayOptions: { show: { resource: ["scan"], operation: ["list"] } },
				default: "",
				description: "Optional substring filter",
			},
			{
				displayName: "Limit",
				name: "limit",
				type: "number",
				displayOptions: {
					show: { resource: ["scan"], operation: ["list"] },
				},
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 20,
			},

			// ---------- Keyword Ranks ----------
			{
				displayName: "Operation",
				name: "operation",
				type: "options",
				noDataExpression: true,
				displayOptions: { show: { resource: ["keywordRanks"] } },
				options: [
					{
						name: "Get Trends",
						value: "trends",
						description: "Keyword × location rank trends with 7d / 30d / lifetime deltas",
					},
				],
				default: "trends",
			},

			// ---------- Geo runs ----------
			{
				displayName: "Operation",
				name: "operation",
				type: "options",
				noDataExpression: true,
				displayOptions: { show: { resource: ["geoRun"] } },
				options: [
					{ name: "List Runs", value: "list", description: "AI answer-engine run history (ChatGPT, Gemini, Perplexity…)" },
					{ name: "Get Run", value: "get", description: "One full AI run — per-engine recommended businesses" },
				],
				default: "list",
			},
			{
				displayName: "Run ID",
				name: "geoRunId",
				type: "number",
				required: true,
				displayOptions: { show: { resource: ["geoRun"], operation: ["get"] } },
				default: 0,
			},
			{
				displayName: "Limit",
				name: "geoRunLimit",
				type: "number",
				displayOptions: { show: { resource: ["geoRun"], operation: ["list"] } },
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 20,
			},
		],
	};

	methods = {
		loadOptions: {
			async getLocationIds(this: ILoadOptionsFunctions) {
				const data = await this.helpers.httpRequestWithAuthentication.call(this, "gbpPeakApi", {
					method: "GET",
					url: `${BASE_URL}/locations`,
					json: true,
				});
				const items = Array.isArray(data) ? data : data?.locations ?? data?.data ?? [];
				return items.map((l: { id: number; label?: string; location_name?: string; name?: string }) => ({
					name: String(l.label ?? l.location_name ?? l.name ?? l.id),
					value: l.id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter("resource", 0) as string;
		const operation = this.getNodeParameter("operation", 0) as string;

		const request = async (options: {
			method: "GET" | "POST" | "DELETE";
			url: string;
			body?: IDataObject;
			qs?: IDataObject;
		}) => this.helpers.httpRequestWithAuthentication.call(this, "gbpPeakApi", {
				...options,
				json: true,
				headers: {
					"Content-Type": "application/json",
				},
			});

		const confirmRequiredBody = (error: unknown): IDataObject | undefined => {
			if (!error || typeof error !== "object") return undefined;
			const outer = error as IDataObject;
			const response = outer.response && typeof outer.response === "object"
				? outer.response as IDataObject : undefined;
			for (const candidate of [response?.body, response?.data, outer.body, outer]) {
				let body: unknown = candidate;
				if (typeof body === "string") {
					try { body = JSON.parse(body); } catch { continue; }
				}
				if (body && typeof body === "object" && (body as IDataObject).code === "confirm_required") {
					return body as IDataObject;
				}
			}
			return undefined;
		};

		for (let i = 0; i < items.length; i++) {
			try {
				let response: unknown;

				if (resource === "location") {
					if (operation !== "list") {
						throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}"`, { itemIndex: i });
					}
					response = await request({ method: "GET", url: `${BASE_URL}/locations` });
				} else if (resource === "scan") {
					if (operation === "create") {
						const rawKeywords = (this.getNodeParameter("keywords", i) as string)
							.split(",")
							.map((k) => k.trim())
							.filter(Boolean)
							.slice(0, 200);
						if (rawKeywords.length === 0) {
							throw new NodeOperationError(this.getNode(), "Provide at least one keyword");
						}
						const body = {
							locationId: this.getNodeParameter("locationId", i) as number,
							keywords: rawKeywords,
							mode: this.getNodeParameter("gridMode", i) as string,
							gridSize: this.getNodeParameter("gridSize", i) as number,
							radiusKm: this.getNodeParameter("radiusKm", i) as number,
							confirm: this.getNodeParameter("confirm", i) as boolean,
						};
						response = await request({ method: "POST", url: `${BASE_URL}/scans`, body });
					} else if (operation === "get") {
						const scanId = this.getNodeParameter("scanId", i) as number;
						response = await request({ method: "GET", url: `${BASE_URL}/scans/${scanId}` });
					} else if (operation === "list") {
						const qs: IDataObject = {
							limit: this.getNodeParameter("limit", i) as number,
						};
						const locationIdNumber = this.getNodeParameter("locationIdNumber", i) as number;
						if (locationIdNumber > 0) qs.locationId = locationIdNumber;
						const keywordFilter = this.getNodeParameter("keywordFilter", i) as string;
						if (keywordFilter) qs.keyword = keywordFilter;
						response = await request({ method: "GET", url: `${BASE_URL}/scans`, qs });
					} else if (operation === "cancel") {
						response = await request({ method: "DELETE", url: `${BASE_URL}/scans` });
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}"`, { itemIndex: i });
					}
				} else if (resource === "keywordRanks") {
					if (operation !== "trends") {
						throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}"`, { itemIndex: i });
					}
					response = await request({ method: "GET", url: `${BASE_URL}/keyword-ranks` });
				} else if (resource === "geoRun") {
					if (operation === "get") {
						const runId = this.getNodeParameter("geoRunId", i) as number;
						response = await request({ method: "GET", url: `${BASE_URL}/geo-runs/${runId}` });
					} else if (operation === "list") {
						response = await request({
							method: "GET",
							url: `${BASE_URL}/geo-runs`,
							qs: { limit: this.getNodeParameter("geoRunLimit", i) as number },
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}"`, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported resource "${resource}"`, { itemIndex: i });
				}

				const wrapped = Array.isArray(response)
					? response.map((j) => ({ json: j, pairedItem: { item: i } }))
					: [{ json: response ?? {}, pairedItem: { item: i } }];
				returnData.push(...wrapped);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				const body = confirmRequiredBody(error);
				if (body?.code === "confirm_required") {
					const apiMessage = typeof body.error === "string"
						? body.error
						: (error as Error).message;
					throw new NodeOperationError(
						this.getNode(),
						apiMessage + " — review the cost and available credits before enabling Confirm to run once.",
						{ itemIndex: i }
					);
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeApiError(this.getNode(), error as never, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
