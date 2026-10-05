import {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from "n8n-workflow";

export class GbpPeakApi implements ICredentialType {
	name = "gbpPeakApi";
	displayName = "GBP Peak API";
	documentationUrl = "https://gbppeak.com/api-docs";
	properties: INodeProperties[] = [
		{
			displayName: "API Token",
			name: "apiToken",
			type: "string",
			typeOptions: { password: true },
			required: true,
			default: "",
			description:
				"Create at gbppeak.com → Settings → AI access. Starts with gbpk_. One token covers the REST API and the MCP server.",
		},
	];

	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...(requestOptions.headers ?? {}),
			Authorization: `Bearer ${credentials.apiToken as string}`,
		};
		return requestOptions;
	}

	test = {
		request: {
			method: "GET" as const,
			url: "https://gbppeak.com/api/v1/locations",
		},
	};
}
