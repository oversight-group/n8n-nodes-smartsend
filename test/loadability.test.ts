/**
 * Guards the load path itself.
 *
 * A previous release shipped `inputs: [NodeConnectionTypes.Main]`. On older n8n
 * installs that export does not exist, so reading `.Main` threw while the class
 * was constructed and n8n reported "Class could not be found. Please check if
 * the class is named correctly." — which points nowhere near the real cause.
 *
 * These tests assert the node and credential can be constructed even when
 * n8n-workflow lacks the newer export.
 */
describe('node loads under an older n8n-workflow', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	afterEach(() => {
		jest.resetModules();
		jest.unmock('n8n-workflow');
	});

	it('constructs when NodeConnectionTypes is absent', () => {
		jest.doMock('n8n-workflow', () => {
			const actual = jest.requireActual('n8n-workflow');
			return { ...actual, NodeConnectionTypes: undefined };
		});

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { SmartSend } = require('../nodes/SmartSend/SmartSend.node');
		const node = new SmartSend();

		expect(node.description.inputs).toEqual(['main']);
		expect(node.description.outputs).toEqual(['main']);
	});

	it('constructs normally when NodeConnectionTypes is present', () => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { SmartSend } = require('../nodes/SmartSend/SmartSend.node');
		const node = new SmartSend();

		expect(node.description.inputs).toEqual(['main']);
		expect(node.description.outputs).toEqual(['main']);
	});
});

describe('class names match what n8n derives from the filenames', () => {
	it('SmartSend.node.js exports a class named SmartSend', () => {
		// n8n strips ".node" from the filename and instantiates that export.
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mod = require('../nodes/SmartSend/SmartSend.node');
		expect(typeof mod.SmartSend).toBe('function');
		expect(() => new mod.SmartSend()).not.toThrow();
	});

	it('SmartSendApi.credentials.js exports a class named SmartSendApi', () => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mod = require('../credentials/SmartSendApi.credentials');
		expect(typeof mod.SmartSendApi).toBe('function');
		expect(() => new mod.SmartSendApi()).not.toThrow();
	});
});
