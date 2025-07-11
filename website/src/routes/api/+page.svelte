<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Collapsible from '$lib/components/ui/collapsible';

	import Key from 'lucide-svelte/icons/key';
	import Activity from 'lucide-svelte/icons/activity';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	import { toast } from 'svelte-sonner';
	import Codeblock from '$lib/components/self/Codeblock.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';

	let { data } = $props();
	let apiKey = $state(null);
	let apiKeyId = $state<string | null>(data.apiKey?.id || null);
	let justCreated = $state(false);
	let credits = $state(data.apiKey?.remaining || 0);
	let todayUsage = $state(data.todayUsage || 0);
	let shouldSignIn = $state(false);

	const maxDailyRequests = 2000;
	const usagePercentage = $derived((todayUsage / maxDailyRequests) * 100);

	let loading = $state(false);

	// State for collapsible sections
	let authOpen = $state(false);
	let topCoinsOpen = $state(false);
	let marketDataOpen = $state(false);
	let coinDetailsOpen = $state(false);
	let holdersOpen = $state(false);
	let hopiumOpen = $state(false);
	let hopiumDetailsOpen = $state(false);
	let rateLimitingOpen = $state(false);
	let errorResponsesOpen = $state(false);

	async function createKey() {
		loading = true;
		try {
			const response = await fetch('/api/keys', {
				method: 'POST'
			});
			if (!response.ok) throw new Error('Failed to create key');
			const { id, key, remaining } = await response.json();
			apiKeyId = id;
			apiKey = key;
			credits = remaining;

			justCreated = true;
			toast.success('API key created');
		} catch (err) {
			toast.error('Failed to create API key');
		} finally {
			loading = false;
		}
	}

	async function regenerateKey() {
		loading = true;
		try {
			const response = await fetch(`/api/keys/${apiKeyId}/regenerate`, {
				method: 'POST'
			});
			if (!response.ok) throw new Error('Failed to regenerate key');
			const { id, key, remaining } = await response.json();
			apiKeyId = id;
			apiKey = key;
			credits = remaining;
			justCreated = true;
			toast.success('API key regenerated');
		} catch (err) {
			toast.error('Failed to regenerate key');
		} finally {
			loading = false;
		}
	}
</script>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto max-w-4xl space-y-6 p-4 md:p-8">
	<div class="flex flex-col items-center justify-center">
		<h1 class="text-3xl font-bold">API Access</h1>
		<p class="text-muted-foreground">Manage your API access and usage</p>
	</div>

	{#if !$USER_DATA}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Key class="text-muted-foreground mb-4 h-12 w-12" />
				<h3 class="mb-2 text-lg font-semibold">Sign in required</h3>
				<p class="text-muted-foreground mb-4 text-center">
					Sign in to get your free API key.
				</p>
				<Button onclick={() => (shouldSignIn = true)}>Sign In</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Usage Card -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Activity class="h-5 w-5" />
					Today's Usage
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>{todayUsage.toLocaleString()} requests</span>
						<span>{maxDailyRequests.toLocaleString()} max</span>
					</div>
					<Progress value={usagePercentage} class="h-2" />
					<p class="text-muted-foreground text-xs">
						{Math.max(0, maxDailyRequests - todayUsage).toLocaleString()} requests remaining today
					</p>
				</div>
			</CardContent>
		</Card>

		<!-- API Key Management -->
		<Card>
			<CardHeader>
				<div class="flex items-start justify-between">
					<div>
						<CardTitle>API Key</CardTitle>
						<p class="text-muted-foreground text-sm">
							Use this key to authenticate your API requests
						</p>
					</div>
					{#if apiKeyId}
						<Button variant="outline" onclick={regenerateKey} disabled={loading}>
							<Key class="h-4 w-4" />
							Regenerate
						</Button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				{#if apiKey && justCreated}
					<div class="space-y-4">
						<Codeblock text={apiKey} />
						<Alert>
							<AlertTriangle class="h-4 w-4" />
							<AlertDescription>
								This is the only time your full API key will be shown. If you lose it, you'll need
								to create a new one.
							</AlertDescription>
						</Alert>
					</div>
				{:else if !apiKey && data.apiKey && apiKeyId}
					<div class="space-y-4">
						<Codeblock text={`${data.apiKey.prefix}${'x'.repeat(64)}`} displayOnly={true} />
						<p class="text-muted-foreground text-xs">
							For security reasons, the full API key is only shown once upon creation. If you've
							lost your key, you'll need to regenerate it.
						</p>
					</div>
				{:else}
					<Button onclick={createKey} disabled={loading}>
						<Key class="h-4 w-4" />
						Create API Key
					</Button>
				{/if}
			</CardContent>
		</Card>

		<!-- Documentation -->
		<Card>
			<CardHeader>
				<CardTitle>API Documentation</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Authentication -->
				<Collapsible.Root bind:open={authOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<h3 class="text-lg font-semibold">Authentication</h3>
						{#if authOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Include your API key in the Authorization header for all requests:
						</p>
						<Codeblock
							text={`Authorization: Bearer ${data.apiKey?.prefix ?? 'rgpl_'}your_api_key`}
							displayOnly={true}
						/>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Top Coins Endpoint -->
				<Collapsible.Root bind:open={topCoinsOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<div class="text-left">
							<h3 class="text-lg font-semibold">Get Top Coins</h3>
							<p class="text-muted-foreground text-sm">GET api.rugplay.com/api/v1/top</p>
						</div>
						{#if topCoinsOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Returns the top 50 coins by market cap.
						</p>
						<div class="space-y-2">
							<h4 class="font-medium">Endpoint</h4>
							<Codeblock text="GET https://api.rugplay.com/api/v1/top" displayOnly={true} />
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Example Response</h4>
							<Codeblock
								text={`{
  "coins": [
    {
      "symbol": "TEST",
      "name": "Test",
      "icon": "coins/test.webp",
      "price": 76.52377103,
      "change24h": 7652377003.1039,
      "marketCap": 76523771031.04,
      "volume24h": 13744958.18
    }
  ]
}`}
								displayOnly={true}
							/>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Market Data Endpoint -->
				<Collapsible.Root bind:open={marketDataOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<div class="text-left">
							<h3 class="text-lg font-semibold">Get Market Data</h3>
							<p class="text-muted-foreground text-sm">GET api.rugplay.com/api/v1/market</p>
						</div>
						{#if marketDataOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Returns paginated market data with filtering and sorting options.
						</p>
						<div class="space-y-2">
							<h4 class="font-medium">Endpoint</h4>
							<Codeblock text="GET https://api.rugplay.com/api/v1/market" displayOnly={true} />
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Query Parameters</h4>
							<div class="rounded-md border p-3">
								<div class="space-y-1 text-sm">
									<div><code class="bg-muted rounded px-1">search</code> - Search by coin name or symbol</div>
									<div><code class="bg-muted rounded px-1">sortBy</code> - Sort field: marketCap, currentPrice, change24h, volume24h, createdAt (default: marketCap)</div>
									<div><code class="bg-muted rounded px-1">sortOrder</code> - Sort order: asc, desc (default: desc)</div>
									<div><code class="bg-muted rounded px-1">priceFilter</code> - Price range: all, under1, 1to10, 10to100, over100 (default: all)</div>
									<div><code class="bg-muted rounded px-1">changeFilter</code> - Change filter: all, gainers, losers, hot, wild (default: all)</div>
									<div><code class="bg-muted rounded px-1">page</code> - Page number (default: 1)</div>
									<div><code class="bg-muted rounded px-1">limit</code> - Items per page, max 100 (default: 12)</div>
								</div>
							</div>
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Example Response</h4>
							<Codeblock
								text={`{
  "coins": [
    {
      "symbol": "TEST",
      "name": "Test",
      "icon": "coins/test.webp",
      "currentPrice": 76.52377103,
      "marketCap": 76523771031.04,
      "volume24h": 13744958.18,
      "change24h": 7652377003.1039,
      "createdAt": "2025-06-24T16:18:51.278Z",
      "creatorName": "FaceDev"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 12,
  "totalPages": 13
}`}
								displayOnly={true}
							/>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Coin Details Endpoint -->
				<Collapsible.Root bind:open={coinDetailsOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<div class="text-left">
							<h3 class="text-lg font-semibold">Get Coin Details</h3>
							<p class="text-muted-foreground text-sm">GET api.rugplay.com/api/v1/coin/&lbrace;symbol&rbrace;</p>
						</div>
						{#if coinDetailsOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Returns detailed information about a specific coin including price history.
						</p>
						<div class="space-y-2">
							<h4 class="font-medium">Endpoint</h4>
							<Codeblock text="GET https://api.rugplay.com/api/v1/coin/&lbrace;symbol&rbrace;" displayOnly={true} />
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Parameters</h4>
							<div class="rounded-md border p-3">
								<div class="space-y-1 text-sm">
									<div><code class="bg-muted rounded px-1">symbol</code> - Coin symbol (e.g., "TEST")</div>
									<div><code class="bg-muted rounded px-1">timeframe</code> - Optional. Chart timeframe: 1m, 5m, 15m, 1h, 4h, 1d (default: 1m)</div>
								</div>
							</div>
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Example Response</h4>
							<Codeblock
								text={`{
  "coin": {
    "id": 2668,
    "name": "Test",
    "symbol": "TEST",
    "icon": "coins/test.webp",
    "currentPrice": 76.70938996,
    "marketCap": 76709389959.04,
    "volume24h": 13764558.38,
    "change24h": 7670938895.9045,
    "poolCoinAmount": 114176.23963001,
    "poolBaseCurrencyAmount": 8758389.68983547,
    "circulatingSupply": 1000000000,
    "initialSupply": 1000000000,
    "isListed": true,
    "createdAt": "2025-06-24T16:18:51.278Z",
    "creatorId": 1,
    "creatorName": "FaceDev",
    "creatorUsername": "facedev",
    "creatorBio": "the one and only",
    "creatorImage": "avatars/1.jpg"
  },
  "candlestickData": [
    {
      "time": 1750805760,
      "open": 74.96948181,
      "high": 74.96948181,
      "low": 74.96948181,
      "close": 74.96948181
    }
  ],
  "volumeData": [
    {
      "time": 1750805760,
      "volume": 1234.56
    }
  ],
  "timeframe": "1m"
}`}
								displayOnly={true}
							/>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Coin Holders Endpoint -->
				<Collapsible.Root bind:open={holdersOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<div class="text-left">
							<h3 class="text-lg font-semibold">Get Coin Holders</h3>
							<p class="text-muted-foreground text-sm">GET api.rugplay.com/api/v1/holders/&lbrace;symbol&rbrace;</p>
						</div>
						{#if holdersOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Returns the top 50 holders of a specific coin.
						</p>
						<div class="space-y-2">
							<h4 class="font-medium">Endpoint</h4>
							<Codeblock text="GET https://api.rugplay.com/api/v1/holders/&lbrace;symbol&rbrace;" displayOnly={true} />
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Parameters</h4>
							<div class="rounded-md border p-3">
								<div class="space-y-1 text-sm">
									<div><code class="bg-muted rounded px-1">symbol</code> - Coin symbol (e.g., "TEST")</div>
									<div><code class="bg-muted rounded px-1">limit</code> - Number of holders to return, max 200 (default: 50)</div>
								</div>
							</div>
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Example Response</h4>
							<Codeblock
								text={`{
  "coinSymbol": "TEST",
  "totalHolders": 50,
  "circulatingSupply": 1000000000,
  "poolInfo": {
    "coinAmount": 114176.23963001,
    "baseCurrencyAmount": 8758389.68983547,
    "currentPrice": 76.70938996
  },
  "holders": [
    {
      "rank": 1,
      "userId": 1,
      "username": "facedev",
      "name": "FaceDev",
      "image": "avatars/1.jpg",
      "quantity": 999883146.4679264,
      "percentage": 99.98831464679265,
      "liquidationValue": 4368219.41924125
    }
  ]
}`}
								displayOnly={true}
							/>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Hopium Questions Endpoint -->
				<Collapsible.Root bind:open={hopiumOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<div class="text-left">
							<h3 class="text-lg font-semibold">Get Prediction Markets (Hopium)</h3>
							<p class="text-muted-foreground text-sm">GET api.rugplay.com/api/v1/hopium</p>
						</div>
						{#if hopiumOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Returns prediction market questions with pagination and filtering options.
						</p>
						<div class="space-y-2">
							<h4 class="font-medium">Endpoint</h4>
							<Codeblock text="GET https://api.rugplay.com/api/v1/hopium" displayOnly={true} />
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Query Parameters</h4>
							<div class="rounded-md border p-3">
								<div class="space-y-1 text-sm">
									<div><code class="bg-muted rounded px-1">status</code> - Filter by status: ACTIVE, RESOLVED, CANCELLED, ALL (default: ACTIVE)</div>
									<div><code class="bg-muted rounded px-1">page</code> - Page number (default: 1)</div>
									<div><code class="bg-muted rounded px-1">limit</code> - Items per page, max 100 (default: 20)</div>
								</div>
							</div>
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Example Response</h4>
							<Codeblock
								text={`{
  "questions": [
    {
      "id": 101,
      "question": "will elon musk tweet about rugplay?",
      "status": "ACTIVE",
      "resolutionDate": "2025-07-25T10:39:19.612Z",
      "totalAmount": 4007.76,
      "yesAmount": 3634.65,
      "noAmount": 373.11,
      "yesPercentage": 90.69,
      "noPercentage": 9.31,
      "createdAt": "2025-06-25T10:39:19.613Z",
      "resolvedAt": null,
      "requiresWebSearch": true,
      "aiResolution": null,
      "creator": {
        "id": 3873,
        "name": "Eliaz",
        "username": "eluskulus",
        "image": "avatars/102644133851219200932.png"
      },
      "userBets": null
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}`}
								displayOnly={true}
							/>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Hopium Question Details Endpoint -->
				<Collapsible.Root bind:open={hopiumDetailsOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<div class="text-left">
							<h3 class="text-lg font-semibold">Get Prediction Market Details</h3>
							<p class="text-muted-foreground text-sm">GET api.rugplay.com/api/v1/hopium/&lbrace;question_id&rbrace;</p>
						</div>
						{#if hopiumDetailsOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-3 p-4">
						<p class="text-muted-foreground text-sm">
							Returns detailed information about a specific prediction market question including recent bets and probability history.
						</p>
						<div class="space-y-2">
							<h4 class="font-medium">Endpoint</h4>
							<Codeblock text="GET https://api.rugplay.com/api/v1/hopium/&lbrace;question_id&rbrace;" displayOnly={true} />
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Parameters</h4>
							<div class="rounded-md border p-3">
								<div class="space-y-1 text-sm">
									<div><code class="bg-muted rounded px-1">question_id</code> - Question ID (e.g., 101)</div>
								</div>
							</div>
						</div>
						<div class="space-y-2">
							<h4 class="font-medium">Example Response</h4>
							<Codeblock
								text={`{
  "question": {
    "id": 101,
    "question": "will elon musk tweet about rugplay?",
    "status": "ACTIVE",
    "resolutionDate": "2025-07-25T10:39:19.612Z",
    "totalAmount": 4007.76,
    "yesAmount": 3634.65,
    "noAmount": 373.11,
    "yesPercentage": 90.69,
    "noPercentage": 9.31,
    "createdAt": "2025-06-25T10:39:19.613Z",
    "resolvedAt": null,
    "requiresWebSearch": true,
    "aiResolution": null,
    "creator": {
      "id": 3873,
      "name": "Eliaz",
      "username": "eluskulus",
      "image": "avatars/102644133851219200932.png"
    },
    "userBets": null,
    "recentBets": [
      {
        "id": 8066,
        "side": true,
        "amount": 3.84,
        "createdAt": "2025-06-25T14:59:54.201Z",
        "user": {
          "id": 5332,
          "name": "Spam email inhaler",
          "username": "sunny_tiger7616",
          "image": "avatars/111376429189149628011.webp"
        }
      }
    ]
  },
  "probabilityHistory": [
    {
      "time": 1750805760,
      "value": 50.0
    },
    {
      "time": 1750805820,
      "value": 65.2
    }
  ]
}`}
							displayOnly={true}
							/>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Rate Limiting -->
				<Collapsible.Root bind:open={rateLimitingOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<h3 class="text-lg font-semibold">Rate Limiting</h3>
						{#if rateLimitingOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="p-4">
						<div class="rounded-md border p-4">
							<div class="space-y-2 text-sm">
								<div>• <strong>Daily limit:</strong> {maxDailyRequests.toLocaleString()} requests per day</div>
								<div>• <strong>Cost:</strong> 1 credit per API call</div>
								<div>• <strong>Error response:</strong> 429 Too Many Requests when limit exceeded</div>
								<div>• <strong>Reset:</strong> Daily limits reset every 24 hours</div>
							</div>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<!-- Error Responses -->
				<Collapsible.Root bind:open={errorResponsesOpen}>
					<Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
						<h3 class="text-lg font-semibold">Error Responses</h3>
						{#if errorResponsesOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-2 p-4">
						<h4 class="font-medium">Common Error Codes</h4>
						<div class="rounded-md border p-4">
							<div class="space-y-2 text-sm">
								<div>• <code class="bg-muted rounded px-1">400</code> - Bad Request (invalid parameters)</div>
								<div>• <code class="bg-muted rounded px-1">401</code> - Unauthorized (invalid or missing API key)</div>
								<div>• <code class="bg-muted rounded px-1">404</code> - Not Found (coin/question doesn't exist)</div>
								<div>• <code class="bg-muted rounded px-1">429</code> - Too Many Requests (rate limit exceeded)</div>
								<div>• <code class="bg-muted rounded px-1">500</code> - Internal Server Error</div>
							</div>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>
			</CardContent>
		</Card>
	{/if}
</div>
