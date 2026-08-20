import type { INodeProperties } from 'n8n-workflow';
import { blacklistDescription } from './blacklist';
import { botDescription } from './bot';
import { conversationDescription } from './conversation';
import { customFieldDescription } from './customField';
import { listDescription } from './list';
import { messageDescription } from './message';
import { notificationDescription } from './notification';
import { organizationDescription } from './organization';
import { resourceProperty } from './shared';
import { tagDescription } from './tag';

export { resourceProperty };

export const descriptions: INodeProperties[] = [
	resourceProperty,
	...messageDescription,
	...conversationDescription,
	...tagDescription,
	...listDescription,
	...customFieldDescription,
	...botDescription,
	...blacklistDescription,
	...notificationDescription,
	...organizationDescription,
];
