<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { signIn } from '$lib/auth-client';
	import { page } from '$app/state';
	import { PUBLIC_DEMO_MODE } from '$env/static/public';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	async function onConfirm() {
		await signIn.social({
			provider: 'google',
			callbackURL: `${page.url.pathname}?signIn=1`
		});
	}

	async function onDemoSignIn() {
		try {
			const response = await fetch('/api/auth/demo-signin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				toast.success('Signed in as demo user!');
				open = false;
				// Reload the page to refresh the session
				window.location.reload();
			} else {
				const error = await response.json();
				toast.error(error.message || 'Failed to sign in as demo user');
			}
		} catch (error) {
			toast.error('Failed to sign in as demo user');
		}
	}

	let { open = $bindable(false) } = $props<{
		open?: boolean;
	}>();

	// Check if demo mode is enabled
	const isDemoMode = PUBLIC_DEMO_MODE === 'true';
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Sign in to Rugplay</DialogTitle>
			<DialogDescription>
				Choose a service to sign in with. Your account will be created automatically if you don't
				have one.
			</DialogDescription>
		</DialogHeader>		<div class="flex flex-col gap-4 py-2">
			{#if isDemoMode}
				<Button
					class="flex w-full items-center justify-center gap-2"
					variant="default"
					onclick={() => onDemoSignIn()}
				>
					<span>🎭</span>
					<span>Continue as Demo User</span>
				</Button>
				
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<span class="w-full border-t"></span>
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="bg-background px-2 text-muted-foreground">Or</span>
					</div>
				</div>
			{/if}

			<Button
				class="flex w-full items-center justify-center gap-2"
				variant="outline"
				onclick={() => onConfirm()}
				disabled={isDemoMode && !PUBLIC_DEMO_MODE}
			>
				<img
					class="h-5 w-5"
					src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA"
					alt="Google"
				/>
				<span>Continue with Google</span>
			</Button>

			{#if isDemoMode}
				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
					<p class="text-yellow-800 text-xs text-center">
						🚧 <strong>Demo Mode Active</strong><br>
						You can use the demo user to explore all features without setting up Google OAuth.
					</p>
				</div>
			{/if}

			<p class="text-muted-foreground text-center text-xs">
				By continuing, you agree to our
				<a href="/legal/terms" class="text-primary hover:underline">Terms of Service</a>
				and
				<a href="/legal/privacy" class="text-primary hover:underline">Privacy Policy</a>
			</p>
		</div>
	</DialogContent>
</Dialog>
