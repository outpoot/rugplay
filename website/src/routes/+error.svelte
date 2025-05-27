<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';

	let clickCount = $state(0);

	const status = page.status;
	const message = getDefaultMessage(status);

	function getDefaultMessage(status: number) {
		switch (status) {
			case 404:
				return "This page doesn't exist. Just like the original Vyntr! Or the context mismatch popups in Bliptext";
			case 403:
				return "You don't have permission to access this page. Your credentials are likely ####.";
			case 429:
				return "Too many requests! You're hitting our servers. They have feelings too :(";
			case 500:
				return "Our magic machine just imploded. Don't worry though, we're on it!";
			default:
				return 'Something went wrong. We have no idea what happened, but you can blame us for it on X!';
		}
	}

	function handleImageClick() {
		clickCount++;
	}

	function handleMouseLeave() {
		clickCount = 0;
	}

	let tooltipMessage = $derived(
		clickCount >= 15 ? 'ok you win' : clickCount >= 3 ? 'stop clicking' : 'ts pmo too icl'
	);
</script>

<svelte:head>
	<title>{status} | Rugplay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center gap-12">
	<div class="flex max-w-lg flex-col items-center justify-center text-center">
		<h1 class="text-primary mb-4 font-bold" style="font-size: 3rem; line-height: 1;">
			{status} WRONG TURN?
		</h1>
		<p class="text-muted-foreground mb-8 text-lg">
			{message}
		</p>
		<div class="flex flex-col">
			<Button variant="link" href="https://discord.gg/cKWNV2uZUP" target="_blank">@Discord</Button>
			<Button variant="link" href="https://x.com/facedevstuff" target="_blank">@X</Button>
		</div>
	</div>

	<div
		class="group relative hidden lg:block"
		role="button"
		tabindex="0"
		onclick={handleImageClick}
		onmouseleave={handleMouseLeave}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleImageClick();
			}
		}}
		aria-label="Click to interact with error illustration"
	>
		<img
			src="/404.gif"
			alt="404 Error Illustration"
			class="h-64 w-64 cursor-pointer object-contain transition-transform duration-300 hover:rotate-12 hover:scale-110"
		/>
		<div
			class="absolute -top-12 left-1/2 z-10 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
		>
			{tooltipMessage}
			<div
				class="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-black"
			></div>
		</div>
	</div>
</div>
