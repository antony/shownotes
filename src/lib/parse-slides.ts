import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PRESENTATION } from '$env/static/private';

export interface Directive {
	name: string;
	value: string;
	raw: string;
}

export interface Slide {
	content: string;
	notes: string;
	directives: Directive[];
}

export const AVAILABLE_ANIMATIONS = [
	{ name: 'fade', description: 'Crossfade opacity' },
	{ name: 'slide-in', description: 'Slide in from the direction of navigation' },
	{ name: 'zoom', description: 'Zoom in from center' },
	{ name: 'flip', description: '3D flip on the X axis' },
	{ name: 'drop', description: 'Drop in from above with a slight bounce' }
] as const;

const NOTES_RE = /^!---\s*\n([\s\S]*?)^---!\s*$/gm;
const DIRECTIVE_RE = /^@(\w[\w-]*)\s+(.+)$/;

function parseDirectives(raw: string): { notes: string; directives: Directive[] } {
	const directives: Directive[] = [];
	const notesLines: string[] = [];

	for (const line of raw.split('\n')) {
		const m = line.match(DIRECTIVE_RE);
		if (m) {
			directives.push({ name: m[1], value: m[2].trim(), raw: line.trim() });
		} else {
			notesLines.push(line);
		}
	}

	return { notes: notesLines.join('\n').trim(), directives };
}

export async function loadSlides(): Promise<Slide[]> {
	const filePath = resolve(PRESENTATION);
	const raw = await readFile(filePath, 'utf-8');

	const parts = raw
		.split(/^(?=# )/m)
		.map((s) => s.trim())
		.filter(Boolean);

	return parts.map((part) => {
		const notesBlocks: string[] = [];
		const content = part
			.replace(NOTES_RE, (_match, body: string) => {
				notesBlocks.push(body.trim());
				return '';
			})
			.trim();

		const combined = notesBlocks.join('\n\n');
		const { notes, directives } = parseDirectives(combined);

		return { content, notes, directives };
	});
}
