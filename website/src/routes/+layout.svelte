<script lang="ts">
	import '../app.css';

	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner';

	import AppSidebar from '$lib/components/self/AppSidebar.svelte';

	import { USER_DATA } from '$lib/stores/user-data';
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { ModeWatcher } from 'mode-watcher';
	import { page } from '$app/state';
	import { websocketController } from '$lib/stores/websocket';
	import { RenderScan } from 'svelte-render-scan';
	import QuickJump from '$lib/components/self/QuickJump.svelte';
	import { Button } from '$lib/components/ui/button';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Search01Icon } from '@hugeicons/core-free-icons';
	import { isApplePlatform } from '$lib/utils';

	let quickJumpOpen = $state(false);
	let shortcutLabel = $state('Ctrl K');

	function handleGlobalKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			quickJumpOpen = !quickJumpOpen;
		}
	}

	let { data, children } = $props<{
		data: { userSession?: any };
		children: any;
	}>();

	untrack(() => USER_DATA.set(data?.userSession ?? null));
	$effect(() => {
		USER_DATA.set(data?.userSession ?? null);
	});

	onMount(() => {
		if (isApplePlatform()) shortcutLabel = '⌘K';
		websocketController.connect();

		console.log(
			`%c                                       .--                    
                                      .=--:                   
                                   :=*#*:                     
                               .=******+#*.                   
                            .+*****+*#*+**#*                  
                          :**++**####*###*++#-                
                        =***+*####******###*+#*               
                      =***++#####***+++***%#*+*%:             
                    =*++*###+=++++====****##%#**#=            
                 .+**+=*##=*###+####*#+++*###%#**#=           
               :#*=**####=*#+-*##=-*##+**#####%##*%=          
     .      :+**++*###***++=*#++=*###**######%%%####:.--:     
    .---=******+*###****=***=-**+##*#+*###%%%***##%%#=--:     
     :-:  =#++**##***+++=******#*=##**#%%%##*#%*:             
           .**++*##***++**+**#*####+*%%#**#%+.                
             +***+##*=**=++******##%%*####:                   
              -#+++###***+*######%####%+                      
               .#*++*##**#####%%#**##=                        
                 *#*+*######%%#*###=                          
                  +#**#%%%%##**##-                            
                   =#***#*###%+.                              
                    -%#####*:                                 
                    .=%#*:                                    
                 .=--=.                                       
                   ::`,
			'color: #4962ee; font-family: monospace; font-size: 12px; font-weight: bold; text-shadow: 2px 2px rgba(0,0,0,0.2);'
		);
		console.log(
			'%c Welcome to Rugplay! DO NOT FUCKING PASTE ANYTHING IN THE CONSOLE UNLESS YOU KNOW WHAT YOU ARE DOING.',
			'color: #4962ee; font-family: monospace; font-size: 12px; font-weight: bold; text-shadow: 2px 2px rgba(0,0,0,0.2);'
		);
		console.log(
			'%c A product by Outpoot.com',
			'color: #4962ee; font-family: monospace; font-size: 12px; font-weight: bold; text-shadow: 2px 2px rgba(0,0,0,0.2);'
		);

		const url = new URL(window.location.href);
		if (url.searchParams.has('signIn')) {
			url.searchParams.delete('signIn');
			window.history.replaceState({}, '', url);
			invalidateAll();
		}

		return () => {
			websocketController.disconnect();
		};
	});

	function getPageTitle(routeId: string | null): string {
		if (!routeId) return 'Rugplay';

		const titleMap: Record<string, string> = {
			'/': 'Home',
			'/market': 'Market',
			'/portfolio': 'Portfolio',
			'/leaderboard': 'Leaderboard',
			'/coin/create': 'Create Coin',
			'/settings': 'Settings',
			'/admin': 'Admin',
			'/admin/users': 'User Management',
			'/admin/promo': 'Promo Codes',
			'/admin/seasons': 'Season Settings',
			'/transactions': 'Transactions',
			'/hopium': 'Hopium',
			'/arcade': 'Arcade',
			'/live': 'Live Trades',
			'/treemap': 'Treemap',
			'/about': 'About',
			'/legal/privacy': 'Privacy Policy',
			'/legal/terms': 'Terms of Service',
			'/shop': 'Shop',
			'/achievements': 'Achievements',
			'/notifications': 'Notifications',
			'/prestige': 'Prestige',
			'/season': 'Season',
			'/api': 'API',
			'/banned': 'Banned'
		};

		// Handle dynamic routes
		if (routeId.startsWith('/coin/[coinSymbol]')) {
			return 'Coin Details';
		}
		if (routeId.startsWith('/user/[username]')) {
			return 'User Profile';
		}
		if (routeId.startsWith('/hopium/[id]')) {
			return 'Prediction Question';
		}

		return titleMap[routeId] || 'Rugplay';
	}

</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<QuickJump bind:open={quickJumpOpen} />

<!-- <RenderScan /> -->
<ModeWatcher />
<Toaster richColors={true} />

<Sidebar.Provider>
	<AppSidebar />

	<Sidebar.Inset class="sidebar-container">
		<header
			class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
		>
			<div class="flex w-full items-center gap-4 px-4 lg:px-6">
				<Sidebar.Trigger class="-ml-1" />

				<h1 class="mr-6 text-base font-medium">
					{getPageTitle(page.route.id)}
				</h1>

				<Button
					variant="outline"
					size="sm"
					class="text-muted-foreground ml-auto h-8 gap-2 px-2 font-normal sm:w-56 sm:justify-start"
					aria-label="Search coins, players and pages"
					onclick={() => (quickJumpOpen = true)}
				>
					<HugeiconsIcon icon={Search01Icon} class="h-4 w-4" />
					<span class="hidden sm:inline">Search...</span>
					<kbd class="ml-auto hidden rounded border px-1.5 text-[10px] font-medium sm:inline">
						{shortcutLabel}
					</kbd>
				</Button>
			</div>
		</header>

		<div class="main-content-area">
			<div class="@container/main flex flex-col gap-2">
				<div class="flex flex-col gap-4 md:gap-6">
					<div class="px-4 md:py-4 lg:px-6">
						{@render children()}
					</div>
				</div>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
