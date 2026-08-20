import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SmartSendApi implements ICredentialType {
	name = 'smartSendApi';

	icon: Icon = { light: 'file:smartsend.svg', dark: 'file:smartsend.dark.svg' };

	displayName = 'Smart Send API';

	documentationUrl = 'https://docs.smartsend.co.il/en/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Organization Token',
			name: 'organizationToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'The long Smart Send integration token, not the short workspace code. Supplying the short code fails with "unknown organization".',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://smartsend-server.otherwise.co.il',
			description: 'Change only for local development against http://localhost:3091',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-organization-id': '={{$credentials.organizationToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/integrations/make/validate',
		},
	};
}
