import { browser } from '$app/environment';
import { defaultLocale, supportedLocales } from '$lib/components/ui/locales/i18n.js';
import { locale, waitLocale } from 'svelte-i18n';
export const ssr = false;

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ data }) => {
	// TODO: Option to change language
	let loc = browser
		? localStorage.getItem('loc') ||
			supportedLocales.includes(window.navigator.language.split('-')[0])
			? window.navigator.language.split('-')[0]
			: defaultLocale
		: defaultLocale;
	if (browser && !supportedLocales.includes(loc)) {
		loc = defaultLocale;
	}
	console.log(loc);
	if (browser) {
		locale.set(loc);
		await waitLocale();
		return data;
	}
};
