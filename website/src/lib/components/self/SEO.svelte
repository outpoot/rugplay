<script lang="ts">
	import { page } from '$app/stores';

	let {
		title = 'Rugplay',
		description = 'Experience realistic cryptocurrency trading simulation game with AI-powered markets, rug pull mechanics, and virtual currencies. Learn crypto trading without financial risk in this educational game.',
		type = 'website',
		image = '/apple-touch-icon.png',
		imageAlt = 'Rugplay Logo',
		keywords = '',
		author = 'Outpoot',
		canonicalUrl = '',
		noindex = false,
		twitterCard = 'summary_large_image'
	}: {
		title?: string;
		description?: string;
		type?: 'website' | 'article' | 'profile';
		image?: string | null;
		imageAlt?: string;
		keywords?: string;
		author?: string;
		canonicalUrl?: string;
		noindex?: boolean;
		twitterCard?: 'summary' | 'summary_large_image';
	} = $props();

	let currentUrl = $derived($page?.url?.href || '');
	let canonical = $derived(canonicalUrl || currentUrl);

	let fullImageUrl = $derived(
		image?.startsWith('http') ? image : `${$page?.url?.origin || 'https://rugplay.com'}${image}`
	);

	let defaultKeywords =
		'cryptocurrency simulation, trading game, crypto simulator, virtual trading, rug pull simulation, defi game, blockchain simulation, bitcoin simulator, ethereum game, trading simulator, educational game, crypto learning';
	let allKeywords = $derived(keywords ? `${defaultKeywords}, ${keywords}` : defaultKeywords);
</script>

<svelte:head>
	<!-- Basic Meta Tags -->
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="keywords" content={allKeywords} />
	<meta name="author" content={author} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta name="robots" content="index, follow" />
	{/if}

	<!-- Canonical URL -->
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}

	<!-- Open Graph Meta Tags -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={currentUrl} />
	<meta property="og:image" content={fullImageUrl} />
	<meta property="og:image:alt" content={imageAlt} />
	<meta property="og:site_name" content="Rugplay" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter Card Meta Tags -->
	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={fullImageUrl} />
	<meta name="twitter:image:alt" content={imageAlt} />
	<meta name="twitter:site" content="@facedevstuff" />
	<meta name="twitter:creator" content="@facedevstuff" />

	<!-- Additional Meta Tags -->
	<meta name="theme-color" content="#fb2c36" />
	<meta name="application-name" content="Rugplay" />
	<meta name="apple-mobile-web-app-title" content="Rugplay" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
</svelte:head>
