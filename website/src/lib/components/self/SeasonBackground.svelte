<script lang="ts">
	let {
		backgroundImage,
		fade = '62%',
		hold = '22%',
		height = 'h-full'
	}: {
		backgroundImage: string | null | undefined;
		fade?: string;
		hold?: string;
		height?: string;
	} = $props();

	let src = $derived(backgroundImage ?? null);
	let mask = $derived(`linear-gradient(to bottom, black 0%, black ${hold}, transparent ${fade})`);
</script>

{#if src}
	<div class="pointer-events-none absolute inset-x-0 top-0 -z-10 {height}" aria-hidden="true">
		<img
			{src}
			alt=""
			loading="lazy"
			decoding="async"
			class="h-full w-full object-cover object-center opacity-20 mix-blend-luminosity dark:opacity-45 dark:mix-blend-normal"
			style="mask-image: {mask}; -webkit-mask-image: {mask};"
		/>
		<div class="from-card/10 via-card/60 to-card absolute inset-0 bg-gradient-to-b"></div>
	</div>
{/if}
