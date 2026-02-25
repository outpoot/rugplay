<script lang="ts">
	import { USER_DATA } from '$lib/stores/user-data';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	let adContainer = $state<HTMLElement>();
	let adPushed = $state(false);
	let adLoaded = $state(false);

	const hideAds = $derived($USER_DATA?.hideAds);

	function checkAdFilled() {
		if (!adContainer) return;
		const ins = adContainer.querySelector('ins.adsbygoogle');
		if (ins) {
			const status = ins.getAttribute('data-ad-status');
			if (status === 'filled') {
				adLoaded = true;
				return;
			}
			if (status === 'unfilled') {
				adLoaded = false;
				return;
			}
		}
		// Check if the ad has any visible content (iframe or img)
		const hasContent = adContainer.querySelector('iframe, img') !== null;
		adLoaded = hasContent;
	}

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
					// Check multiple times as ads load asynchronously
					setTimeout(checkAdFilled, 1500);
					setTimeout(checkAdFilled, 3500);
					setTimeout(checkAdFilled, 6000);
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
		style="max-height: 250px; {adPushed && !adLoaded ? 'min-height: 0; height: 0;' : 'min-height: 90px;'}"
		aria-label="Advertisement"
	>
		<ins
			class="adsbygoogle"
			style="display:block"
			data-ad-client="ca-pub-7420543404967748"
			data-ad-slot="1273699274"
			data-ad-format="auto"
			data-full-width-responsive="true"
		></ins>
	</div>
{/if}
