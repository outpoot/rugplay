<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Home03Icon,
		Store01Icon,
		Briefcase01Icon,
		Joystick04Icon,
		Menu01Icon
	} from '@hugeicons/core-free-icons';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import { UNREAD_COUNT } from '$lib/stores/notifications';
	import { USER_DATA } from '$lib/stores/user-data';
	import { haptic } from '$lib/stores/haptics';

	const sidebar = useSidebar();

	const tabs = [
		{ label: 'Home', href: '/', icon: Home03Icon },
		{ label: 'Market', href: '/market', icon: Store01Icon },
		{ label: 'Portfolio', href: '/portfolio', icon: Briefcase01Icon },
		{ label: 'Arcade', href: '/arcade', icon: Joystick04Icon }
	];

	function isActive(href: string, pathname: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}

	const savedScroll = new Map<string, number>();
	let restoreTo: string | null = null;

	beforeNavigate(({ from }) => {
		const path = from?.url.pathname;
		if (path && tabs.some((tab) => tab.href === path)) savedScroll.set(path, window.scrollY);
	});

	afterNavigate(({ to, type }) => {
		const path = to?.url.pathname;
		if (type !== 'link' || !path || path !== restoreTo) return;
		restoreTo = null;
		const target = savedScroll.get(path);
		if (!target) return;
		const started = performance.now();
		let userTookOver = false;
		const stop = () => (userTookOver = true);
		window.addEventListener('touchstart', stop, { once: true, passive: true });
		const attempt = () => {
			if (userTookOver) return;
			const reachable = document.documentElement.scrollHeight - window.innerHeight >= target;
			if (reachable || performance.now() - started > 1500) {
				window.removeEventListener('touchstart', stop);
				window.scrollTo(0, target);
				return;
			}
			requestAnimationFrame(attempt);
		};
		requestAnimationFrame(attempt);
	});

	function handleTabTap(href: string) {
		haptic.trigger('selection');
		if (isActive(href, page.url.pathname)) {
			savedScroll.delete(href);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			restoreTo = href;
		}
	}

	function openMenu() {
		haptic.trigger('selection');
		sidebar.setOpenMobile(true);
	}

	let showMenuDot = $derived(!!$USER_DATA && $UNREAD_COUNT > 0);

	let typing = $state(false);
	const TEXT_ENTRY =
		'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

	$effect(() => {
		const update = () => {
			typing = !!document.activeElement?.matches(TEXT_ENTRY);
			document.documentElement.toggleAttribute('data-typing', typing);
		};
		const deferredUpdate = () => setTimeout(update, 0);
		document.addEventListener('focusin', update);
		document.addEventListener('focusout', deferredUpdate);
		return () => {
			document.removeEventListener('focusin', update);
			document.removeEventListener('focusout', deferredUpdate);
		};
	});
</script>

<nav
	aria-label="Primary"
	style="view-transition-name: mobile-tab-bar;"
	class="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg transition-transform duration-200 md:hidden {typing
		? 'translate-y-full'
		: ''}"
	aria-hidden={typing || undefined}
>
	<div class="mx-auto grid h-14 max-w-lg grid-cols-5 px-1">
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href, page.url.pathname)}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				onclick={() => handleTabTap(tab.href)}
				class="flex select-none flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:opacity-60 {active
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				<HugeiconsIcon icon={tab.icon} class="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.5} />
				{tab.label}
			</a>
		{/each}
		<button
			type="button"
			onclick={openMenu}
			aria-label={showMenuDot ? `More, ${$UNREAD_COUNT} unread notifications` : 'More'}
			class="text-muted-foreground relative flex select-none flex-col items-center justify-center gap-0.5 text-[10px] font-medium active:opacity-60"
		>
			<span class="relative">
				<HugeiconsIcon icon={Menu01Icon} class="h-[22px] w-[22px]" strokeWidth={1.5} />
				{#if showMenuDot}
					<span
						class="bg-primary text-primary-foreground absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none"
					>
						{$UNREAD_COUNT > 99 ? '99+' : $UNREAD_COUNT}
					</span>
				{/if}
			</span>
			More
		</button>
	</div>
</nav>
