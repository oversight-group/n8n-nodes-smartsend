const FIELD_PREFIX = 'tp__';
const SEPARATOR = '__';
const HEADER_MEDIA_KEY = 'header_media_url';

export interface UrlButtonParam {
	buttonIndex: number;
	value: string;
}

export interface TemplatePayloadParts {
	parameters?: string[];
	urlButtonParams?: UrlButtonParam[];
	headerMediaUrl?: string;
}

export interface BotTemplatePayloadParts {
	templateParams: Record<string, string[]>;
	passthrough: Record<string, string>;
}

/**
 * Builds a dense, 1-indexed array from a sparse map of positions. Gaps become
 * empty strings so positional substitution into {{1}}, {{2}}, ... stays aligned.
 */
function toDenseArray(indexed: Map<number, string>): string[] {
	const highest = Math.max(...indexed.keys());
	const dense: string[] = [];
	for (let i = 1; i <= highest; i += 1) {
		dense.push(indexed.get(i) ?? '');
	}
	return dense;
}

/**
 * Reassembles the flat `tp__*` fields returned by /rpc/template-params into the
 * nested payload /messages/send-template expects.
 */
export function flattenTemplateParams(values: Record<string, unknown>): TemplatePayloadParts {
	const numbered = new Map<number, string>();
	const buttons: UrlButtonParam[] = [];
	const parts: TemplatePayloadParts = {};

	for (const [name, raw] of Object.entries(values)) {
		if (raw === undefined || raw === null) continue;
		const value = String(raw);

		if (name === `${FIELD_PREFIX}${HEADER_MEDIA_KEY}`) {
			if (value !== '') parts.headerMediaUrl = value;
			continue;
		}

		const button = /^tp__url_btn(\d+)$/.exec(name);
		if (button !== null) {
			// An empty value is intentionally dropped so the button falls back to
			// Meta's example URL rather than resolving to an empty path.
			if (value !== '') buttons.push({ buttonIndex: Number(button[1]), value });
			continue;
		}

		const numeric = /^tp__(\d+)$/.exec(name);
		if (numeric !== null) {
			numbered.set(Number(numeric[1]), value);
		}
	}

	if (numbered.size > 0) parts.parameters = toDenseArray(numbered);
	if (buttons.length > 0) {
		parts.urlButtonParams = buttons.sort((a, b) => a.buttonIndex - b.buttonIndex);
	}

	return parts;
}

/**
 * Splits a bot template field name into its template name and parameter key.
 *
 * Splits on the LAST separator: WhatsApp template names legally contain
 * underscores and may contain `__`, so a left-to-right split is ambiguous.
 * `tp__my__tpl__2` must yield template `my__tpl` with key `2`.
 */
export function splitBotFieldName(
	name: string,
): { templateName: string; key: string } | undefined {
	if (!name.startsWith(FIELD_PREFIX)) return undefined;

	const remainder = name.slice(FIELD_PREFIX.length);
	const cut = remainder.lastIndexOf(SEPARATOR);
	if (cut <= 0) return undefined;

	return {
		templateName: remainder.slice(0, cut),
		key: remainder.slice(cut + SEPARATOR.length),
	};
}

/**
 * Reassembles the flat `tp__<tpl>__*` fields returned by
 * /rpc/bot-template-params.
 *
 * Numbered params become the documented `templateParams` object. URL-button
 * fields are passed through under their original flat key: verified live, the
 * server both accepts and applies them, and /flows/send has no documented slot
 * for them.
 */
export function flattenBotTemplateParams(
	values: Record<string, unknown>,
): BotTemplatePayloadParts {
	const numbered = new Map<string, Map<number, string>>();
	const passthrough: Record<string, string> = {};

	for (const [name, raw] of Object.entries(values)) {
		if (raw === undefined || raw === null) continue;
		const value = String(raw);

		const split = splitBotFieldName(name);
		if (split === undefined) continue;

		if (/^\d+$/.test(split.key)) {
			const forTemplate = numbered.get(split.templateName) ?? new Map<number, string>();
			forTemplate.set(Number(split.key), value);
			numbered.set(split.templateName, forTemplate);
			continue;
		}

		if (value !== '') passthrough[name] = value;
	}

	const templateParams: Record<string, string[]> = {};
	for (const [templateName, indexed] of numbered.entries()) {
		templateParams[templateName] = toDenseArray(indexed);
	}

	return { templateParams, passthrough };
}
