import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { PRESENTATION } from '$env/static/private';

export interface Directive {
	name: string;
	value: string;
	raw: string;
}

export interface SvgEmbed {
	id: string;
	html: string;
}

export interface Slide {
	content: string;
	notes: string;
	directives: Directive[];
	svgs: SvgEmbed[];
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

// [!svg@id]: path/to/file.svg "Optional Title"
const SVG_DEF_RE = /^\[!svg@([\w-]+)\]:\s+(\S+)(?:\s+"([^"]*)")?\s*$/gm;

// [link text][id]
const REF_LINK_RE = /\[([^\]]+)\]\[([\w-]+)\]/g;

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

interface SvgDef {
	path: string;
	title: string;
}

function extractSvgDefs(text: string): { cleaned: string; defs: Map<string, SvgDef> } {
	const defs = new Map<string, SvgDef>();
	const cleaned = text.replace(SVG_DEF_RE, (_match, id: string, path: string, title?: string) => {
		defs.set(id, { path: path.trim(), title: title ?? '' });
		return '';
	});
	return { cleaned, defs };
}

/**
 * Scope CSS @keyframes inside an SVG so multiple inlined SVGs don't clash.
 * Prefixes each @keyframes name and its references in animation/animation-name properties.
 */
function scopeSvgAnimations(svg: string, scope: string): string {
	// Collect all @keyframes names
	const keyframeNames = new Set<string>();
	svg.replace(/@keyframes\s+([\w-]+)/g, (_m, name: string) => {
		keyframeNames.add(name);
		return _m;
	});

	if (keyframeNames.size === 0) return svg;

	let result = svg;
	for (const name of keyframeNames) {
		const scoped = `${scope}-${name}`;
		// Rename @keyframes declaration
		result = result.replace(
			new RegExp(`@keyframes\\s+${escapeRegex(name)}`, 'g'),
			`@keyframes ${scoped}`
		);
		// Rename references in animation and animation-name properties
		// Matches: animation: name ..., animation-name: name
		result = result.replace(
			new RegExp(`(animation(?:-name)?\\s*:[^;]*?)\\b${escapeRegex(name)}\\b`, 'g'),
			`$1${scoped}`
		);
	}
	return result;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveSvgRefs(
	content: string,
	defs: Map<string, SvgDef>,
	baseDir: string
): Promise<{ content: string; svgs: SvgEmbed[] }> {
	const matches = [...content.matchAll(REF_LINK_RE)].filter((m) => defs.has(m[2]));
	if (matches.length === 0) return { content, svgs: [] };

	// Load each referenced SVG once
	const loaded = new Map<string, string>();
	await Promise.all(
		[...new Set(matches.map((m) => m[2]))].map(async (id) => {
			const def = defs.get(id)!;
			const svgPath = resolve(baseDir, def.path);
			try {
				loaded.set(id, await readFile(svgPath, 'utf-8'));
			} catch {
				loaded.set(id, '');
			}
		})
	);

	// Replace refs with placeholders; build SVG embeds list for the client
	const svgs: SvgEmbed[] = [];
	let counter = 0;
	const replaced = content.replace(REF_LINK_RE, (full, text: string, id: string) => {
		const def = defs.get(id);
		if (!def) return full;

		const svg = loaded.get(id);
		const placeholderId = `svg-placeholder-${counter++}`;

		if (!svg) {
			svgs.push({
				id: placeholderId,
				html: `<p class="svg-error">⚠ SVG not found: ${def.path}</p>`
			});
		} else {
			const label = def.title || text;
			const caption = def.title ? `\n<figcaption>${def.title}</figcaption>` : '';
			const scoped = scopeSvgAnimations(svg, placeholderId);
			svgs.push({
				id: placeholderId,
				html: `<figure class="svg-embed" role="img" aria-label="${label}">\n${scoped}${caption}\n</figure>`
			});
		}

		// Placeholder that survives markdown parsing
		return `<div id="${placeholderId}"></div>`;
	});

	return { content: replaced, svgs };
}

export async function loadSlides(): Promise<Slide[]> {
	const filePath = resolve(PRESENTATION);
	const baseDir = dirname(filePath);
	const raw = await readFile(filePath, 'utf-8');

	// Extract SVG definitions from the entire document (they're global)
	const { cleaned, defs } = extractSvgDefs(raw);

	const parts = cleaned
		.split(/^(?=# )/m)
		.map((s) => s.trim())
		.filter(Boolean);

	return Promise.all(
		parts.map(async (part) => {
			const notesBlocks: string[] = [];
			let content = part
				.replace(NOTES_RE, (_match, body: string) => {
					notesBlocks.push(body.trim());
					return '';
				})
				.trim();

			const { content: resolved, svgs } = await resolveSvgRefs(content, defs, baseDir);

			const combined = notesBlocks.join('\n\n');
			const { notes, directives } = parseDirectives(combined);

			return { content: resolved, notes, directives, svgs };
		})
	);
}
