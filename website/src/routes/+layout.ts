import { browser } from '$app/environment';
import { defaultLocale, supportedLocales } from '$lib/components/ui/locales/i18n.js';
import { locale, waitLocale } from 'svelte-i18n';
export const ssr = false;

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ data }) => {
	// TODO: Option to change language
	if (browser) {
		let loc = browser ? window.navigator.language : defaultLocale;
		const baseLoc = loc.split('-')[0];
		if (browser && !(supportedLocales.includes(loc) || supportedLocales.includes(baseLoc)))
			loc = defaultLocale;
		locale.set(loc);
	} else {
		locale.set(defaultLocale);
	}
	await waitLocale();

	return data;
};
