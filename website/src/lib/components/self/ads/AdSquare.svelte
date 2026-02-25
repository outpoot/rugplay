<script lang="ts">
	import { USER_DATA } from '$lib/stores/user-data';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	let adContainer = $state<HTMLElement>();
	let adPushed = $state(false);

	const hideAds = $derived($USER_DATA?.hideAds);

	onMount(() => {
		if (dev || hideAds) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !adPushed) {
					adPushed = true;
					try {
						((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
					} catch (e) {
						// AdSense not loaded yet
					}
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		if (adContainer) observer.observe(adContainer);
		return () => observer.disconnect();
	});
</script>

{#if !dev && !hideAds}
	<div
		bind:this={adContainer}
		class="ad-container my-4 flex items-center justify-center overflow-hidden"
		style="min-height: 250px; max-height: 300px;"
		aria-label="Advertisement"
	>
		<ins
			class="adsbygoogle"
			style="display:block"
			data-ad-client="ca-pub-7420543404967748"
			data-ad-slot="3808033700"
			data-ad-format="auto"
			data-full-width-responsive="true"
		></ins>
	</div>
{/if}
