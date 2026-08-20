import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { SmartSend } from '../nodes/SmartSend/SmartSend.node';
import { OPERATIONS } from '../nodes/SmartSend/operations/registry';

const node = new SmartSend();

describe('SmartSend node description', () => {
	it('declares the credential', () => {
		expect(node.description.credentials).toEqual([{ name: 'smartSendApi', required: true }]);
	});

	it('is usable as an AI agent tool', () => {
		expect(node.description.usableAsTool).toBe(true);
	});

	it('exposes one input and one output', () => {
		expect(node.description.inputs).toHaveLength(1);
		expect(node.description.outputs).toHaveLength(1);
	});

	it('references the bundled icon', () => {
		expect(node.description.icon).toBe('file:smartsend.svg');
	});
});

describe('SmartSend method wiring', () => {
	it('registers every loadOptions method the descriptions reference', () => {
		const referenced = new Set<string>();
		const walk = (props: INodeProperties[]): void => {
			for (const prop of props) {
				const method = (prop.typeOptions as { loadOptionsMethod?: string } | undefined)
					?.loadOptionsMethod;
				if (typeof method === 'string') referenced.add(method);

				for (const option of prop.options ?? []) {
					if ('values' in option) walk(option.values as INodeProperties[]);
				}
			}
		};
		walk(node.description.properties);

		const registered = Object.keys(node.methods?.loadOptions ?? {});
		expect(referenced.size).toBeGreaterThan(0);
		for (const method of referenced) {
			expect(registered).toContain(method);
		}
	});

	it('registers every resourceMapper method the descriptions reference', () => {
		const referenced = node.description.properties
			.filter((p) => p.type === 'resourceMapper')
			.map(
				(p) =>
					(p.typeOptions as { resourceMapper?: { resourceMapperMethod?: string } } | undefined)
						?.resourceMapper?.resourceMapperMethod as string,
			);

		const registered = Object.keys(node.methods?.resourceMapping ?? {});
		expect(referenced.length).toBeGreaterThan(0);
		for (const method of referenced) {
			expect(registered).toContain(method);
		}
	});
});

describe('SmartSend resource and operation coverage', () => {
	const resourceProp = node.description.properties.find((p) => p.name === 'resource');
	const resources = (resourceProp?.options ?? []).map((o) => (o as INodePropertyOptions).value);

	it('lists an operation property for every resource option', () => {
		for (const value of resources) {
			const hasOperation = node.description.properties.some(
				(p) =>
					p.name === 'operation' &&
					(p.displayOptions?.show?.resource as string[] | undefined)?.includes(value as string),
			);
			expect(hasOperation).toBe(true);
		}
	});

	it('backs every advertised resource:operation pair with a registry entry', () => {
		const advertised: string[] = [];
		for (const prop of node.description.properties) {
			if (prop.name !== 'operation') continue;
			const forResources = (prop.displayOptions?.show?.resource as string[] | undefined) ?? [];
			for (const resource of forResources) {
				for (const option of prop.options ?? []) {
					advertised.push(`${resource}:${(option as INodePropertyOptions).value as string}`);
				}
			}
		}

		expect(advertised).toHaveLength(22);
		for (const key of advertised) {
			expect(Object.keys(OPERATIONS)).toContain(key);
		}
	});

	it('advertises every registry operation in the UI, leaving nothing unreachable', () => {
		const advertised = new Set<string>();
		for (const prop of node.description.properties) {
			if (prop.name !== 'operation') continue;
			const forResources = (prop.displayOptions?.show?.resource as string[] | undefined) ?? [];
			for (const resource of forResources) {
				for (const option of prop.options ?? []) {
					advertised.add(`${resource}:${(option as INodePropertyOptions).value as string}`);
				}
			}
		}

		for (const key of Object.keys(OPERATIONS)) {
			expect(Array.from(advertised)).toContain(key);
		}
	});
});
