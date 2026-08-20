import { SmartSendApi } from '../credentials/SmartSendApi.credentials';

describe('SmartSendApi credential', () => {
	const cred = new SmartSendApi();

	it('uses the internal name smartSendApi', () => {
		expect(cred.name).toBe('smartSendApi');
	});

	it('sends the token in the x-organization-id header', () => {
		expect(cred.authenticate.properties.headers).toEqual({
			'x-organization-id': '={{$credentials.organizationToken}}',
		});
	});

	it('defaults baseUrl to production', () => {
		const baseUrl = cred.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrl?.default).toBe('https://smartsend-server.otherwise.co.il');
	});

	it('marks the token as a password field', () => {
		const token = cred.properties.find((p) => p.name === 'organizationToken');
		expect(token?.typeOptions?.password).toBe(true);
	});

	it('tests the credential against the validate endpoint', () => {
		expect(cred.test.request.url).toBe('/integrations/make/validate');
	});
});
