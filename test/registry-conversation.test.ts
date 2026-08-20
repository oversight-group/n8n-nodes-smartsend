import { getOperation } from '../nodes/SmartSend/operations/registry';

describe('conversation operations', () => {
	it('resolve posts only the phone number', () => {
		const op = getOperation('conversation', 'resolve');
		expect(op.endpoint).toBe('/conversations/resolve');
		expect(op.buildBody!({ phoneNumber: '1' })).toEqual({ phoneNumber: '1' });
	});

	it('updateDisplayName preserves an empty name, which resets to the profile name', () => {
		const op = getOperation('conversation', 'updateDisplayName');
		expect(op.endpoint).toBe('/conversations/display-name');
		expect(op.buildBody!({ phoneNumber: '1', displayName: '' })).toEqual({
			phoneNumber: '1',
			displayName: '',
		});
	});

	it('updateDisplayName does not require displayName, so a reset stays possible', () => {
		expect(getOperation('conversation', 'updateDisplayName').required).toEqual(['phoneNumber']);
	});

	it('assignUser carries replaceExisting', () => {
		const op = getOperation('conversation', 'assignUser');
		expect(op.endpoint).toBe('/conversations/assign');
		expect(op.required).toEqual(['phoneNumber', 'userId']);
		expect(op.buildBody!({ phoneNumber: '1', userId: 'u1', replaceExisting: true })).toEqual({
			phoneNumber: '1',
			userId: 'u1',
			replaceExisting: true,
		});
	});

	it('createNote carries the optional agent name', () => {
		const op = getOperation('conversation', 'createNote');
		expect(op.endpoint).toBe('/conversations/notes');
		expect(op.required).toEqual(['phoneNumber', 'content']);
		expect(
			op.buildBody!({ phoneNumber: '1', content: 'note', additionalFields: { agentName: 'Ann' } }),
		).toEqual({ phoneNumber: '1', content: 'note', agentName: 'Ann' });
	});

	it('setFlag sends the chosen colour', () => {
		const op = getOperation('conversation', 'setFlag');
		expect(op.endpoint).toBe('/conversations/flag');
		expect(op.buildBody!({ phoneNumber: '1', color: 'red' })).toEqual({
			phoneNumber: '1',
			color: 'red',
		});
	});

	it('setFlag sends "none" to clear', () => {
		const op = getOperation('conversation', 'setFlag');
		expect(op.buildBody!({ phoneNumber: '1', color: 'none' })).toEqual({
			phoneNumber: '1',
			color: 'none',
		});
	});
});

describe('tag operations', () => {
	it('add posts the tag id', () => {
		const op = getOperation('tag', 'add');
		expect(op.endpoint).toBe('/conversations/tags/add');
		expect(op.required).toEqual(['phoneNumber', 'tagId']);
		expect(op.buildBody!({ phoneNumber: '1', tagId: 't1' })).toEqual({
			phoneNumber: '1',
			tagId: 't1',
		});
	});

	it('remove targets the remove endpoint', () => {
		expect(getOperation('tag', 'remove').endpoint).toBe('/conversations/tags/remove');
	});

	it('clear needs only the phone number', () => {
		const op = getOperation('tag', 'clear');
		expect(op.endpoint).toBe('/conversations/tags/clear');
		expect(op.required).toEqual(['phoneNumber']);
	});

	it('carries actor attribution from additional fields', () => {
		const op = getOperation('tag', 'add');
		expect(
			op.buildBody!({
				phoneNumber: '1',
				tagId: 't1',
				additionalFields: { actorId: 'a', actorName: 'Ann' },
			}),
		).toEqual({ phoneNumber: '1', tagId: 't1', actorId: 'a', actorName: 'Ann' });
	});
});

describe('list operations', () => {
	it('addToConversation posts the list id', () => {
		const op = getOperation('list', 'addToConversation');
		expect(op.endpoint).toBe('/conversations/lists/add');
		expect(op.buildBody!({ phoneNumber: '1', listId: 'l1' })).toEqual({
			phoneNumber: '1',
			listId: 'l1',
		});
	});

	it('clearFromConversation needs only the phone number', () => {
		const op = getOperation('list', 'clearFromConversation');
		expect(op.endpoint).toBe('/conversations/lists/clear');
		expect(op.required).toEqual(['phoneNumber']);
	});

	it('addRecipient requires listId and phoneNumber', () => {
		const op = getOperation('list', 'addRecipient');
		expect(op.endpoint).toBe('/lists/add-recipient');
		expect(op.required).toEqual(['listId', 'phoneNumber']);
	});

	it('addRecipient converts the custom field collection into a map', () => {
		const op = getOperation('list', 'addRecipient');
		expect(
			op.buildBody!({
				listId: 'l1',
				phoneNumber: '1',
				name: 'Ann',
				customFieldsUi: {
					field: [
						{ name: 'city', value: 'TLV' },
						{ name: 'plan', value: 'pro' },
					],
				},
			}),
		).toEqual({
			listId: 'l1',
			phoneNumber: '1',
			name: 'Ann',
			customFields: { city: 'TLV', plan: 'pro' },
		});
	});

	it('addRecipient omits customFields when none are given', () => {
		const op = getOperation('list', 'addRecipient');
		expect(op.buildBody!({ listId: 'l1', phoneNumber: '1' })).toEqual({
			listId: 'l1',
			phoneNumber: '1',
		});
	});

	it('addRecipient skips rows with a blank field name', () => {
		const op = getOperation('list', 'addRecipient');
		expect(
			op.buildBody!({
				listId: 'l1',
				phoneNumber: '1',
				customFieldsUi: { field: [{ name: '', value: 'ignored' }] },
			}),
		).toEqual({ listId: 'l1', phoneNumber: '1' });
	});

	it('removeRecipient targets the remove endpoint', () => {
		const op = getOperation('list', 'removeRecipient');
		expect(op.endpoint).toBe('/lists/remove-recipient');
		expect(op.buildBody!({ listId: 'l1', phoneNumber: '1' })).toEqual({
			listId: 'l1',
			phoneNumber: '1',
		});
	});
});
