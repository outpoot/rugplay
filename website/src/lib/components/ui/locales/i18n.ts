import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

export const defaultLocale = 'en';
export const supportedLocales = ['en'];
register('en', () => import('./en.json'));

init({
	fallbackLocale: defaultLocale,
	initialLocale: browser
		? localStorage.getItem('loc')
			? localStorage.getItem('loc')
			: supportedLocales.includes(window.navigator.language.split('-')[0])
				? window.navigator.language.split('-')[0]
				: defaultLocale
		: defaultLocale
});
