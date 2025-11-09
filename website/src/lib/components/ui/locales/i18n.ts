import { init, register } from 'svelte-i18n';
import { browser } from '$app/environment';

export const defaultLocale = 'en';
export const supportedLocales = [
	{
		id: "en",
		countryFlag: "us",
		loader: async () => (await import("./en")).default
	},
	{
		id: "pt",
		countryFlag: "pt",
		loader: async () => (await import("./pt")).default
	},
].sort((a,b)=>a.id > b.id ? +1 : b.id > a.id ? -1 : 0)
export const rawSupportedLocales = supportedLocales.map(l => l.id);

for (const lang of supportedLocales) {
	register(lang.id, lang.loader)
}

export function getUserLoc() {
	if (!browser) return defaultLocale

	const localStorageValue = localStorage.getItem("language")
	if (localStorageValue && rawSupportedLocales.includes(localStorageValue)) return localStorageValue

	const browserLang = window.navigator.language
	const PBrowserLang = browserLang.split("-")[0]

	if (rawSupportedLocales.includes(browserLang)) return browserLang
	if (rawSupportedLocales.includes(PBrowserLang)) return PBrowserLang

	return defaultLocale
}
init({
	fallbackLocale: defaultLocale,
	initialLocale: getUserLoc()
});
