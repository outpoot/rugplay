import { browser } from '$app/environment';
import { defaultLocale, getUserLoc, rawSupportedLocales } from '$lib/components/ui/locales/i18n.js';
import { locale, waitLocale } from 'svelte-i18n';
export const ssr = false;

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ data }) => {
	// TODO: Option to change language
	const loc = getUserLoc()

	locale.set(loc);
	await waitLocale();
	return data;
};
