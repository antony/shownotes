import { loadSlides } from '$lib/parse-slides';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const slides = await loadSlides();
	return { slides };
};
