<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import Scale from 'lucide-svelte/icons/scale';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import TrendingDown from 'lucide-svelte/icons/trending-down';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const LAST_UPDATED = 'May 29, 2025';
	const CONTACT_EMAIL = 'contact@outpoot.com';
	const MINIMUM_AGE = 18;
</script>

<div class="container mx-auto max-w-4xl py-10">
	<Card.Root class="p-6">
		<div class="mb-8 flex items-center gap-3">
			<Scale class="text-primary h-10 w-10" />
			<div>
				<h1 class="text-4xl font-bold">Terms of Service</h1>
				<p class="text-muted-foreground">
					Last updated: {LAST_UPDATED}
				</p>
			</div>
		</div>

		<Alert.Root class="mb-6">
			<TrendingDown class="h-4 w-4" />
			<Alert.Title>Virtual Currency Simulation Only</Alert.Title>
			<Alert.Description>
				Rugplay uses only virtual currency (*BUSS or "$") with no real monetary value. All trading,
				including rug pulls, is simulated for educational purposes only.
			</Alert.Description>
		</Alert.Root>

		<Separator class="my-6" />

		<div class="space-y-2">
			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">1. Acceptance of Terms</h2>
				<p class="mb-4">
					By accessing and using Rugplay ("the Platform", "we", "us", "our"), you accept and agree
					to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you
					may not use the Platform.
				</p>
				<p>
					These Terms constitute a legally binding agreement between you and Rugplay regarding your
					use of our cryptocurrency trading simulation platform.
				</p>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">2. Platform Description</h2>
				<div class="space-y-4">
					<p>
						Rugplay is a <strong>simulated cryptocurrency trading platform</strong> designed for educational
						and entertainment purposes. The Platform allows users to:
					</p>
					<ul class="ml-6 list-disc space-y-2">
						<li>Create and trade virtual cryptocurrencies</li>
						<li>Participate in simulated liquidity pools</li>
						<li>Experience realistic trading mechanics including slippage</li>
						<li>Learn about "rug pull" risks in a controlled environment</li>
						<li>Participate in prediction markets</li>
						<li>Track portfolio performance with virtual currency</li>
					</ul>

					<Alert.Root class="mt-4">
						<AlertTriangle class="h-4 w-4" />
						<Alert.Title>No Real Financial Value</Alert.Title>
						<Alert.Description>
							All currency on Rugplay (*BUSS, "$", and created coins) is virtual and has no
							real-world monetary value. No real cryptocurrency or money is involved in any
							transactions.
						</Alert.Description>
					</Alert.Root>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">3. Eligibility and Account Requirements</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">3.1 Age Requirements</h3>
						<p class="mb-3">
							You must be at least {MINIMUM_AGE} years old to use Rugplay due to the presence of gambling-style
							features (coinflip and slots), even though they use only virtual currency.
						</p>
						<p class="text-muted-foreground text-sm">
							While our platform uses virtual currency with no real-world value, we maintain an 18+
							age requirement to ensure responsible engagement with simulated gambling mechanics.
						</p>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">3.2 Account Accuracy</h3>
						<p class="mb-3">You agree to:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Provide accurate and truthful information during registration</li>
							<li>Maintain the security of your account credentials</li>
							<li>Notify us immediately of any unauthorized account access</li>
							<li>Use only one account per person</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">3.3 Prohibited Users</h3>
						<p>You may not use Rugplay if you are:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Located in a jurisdiction where use is prohibited</li>
							<li>Previously banned from the Platform</li>
							<li>Acting on behalf of a competitor for data gathering purposes</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="text-destructive mb-4 text-2xl font-semibold">
					4. Virtual Currency and Rug Pull Mechanics
				</h2>

				<Alert.Root class="mb-4">
					<TrendingDown class="h-4 w-4" />
					<Alert.Title>Rug Pull Risk Simulation</Alert.Title>
					<Alert.Description>
						Rugplay deliberately simulates rug pull scenarios where coin creators or large holders
						can crash prices by selling significant holdings. This is a core educational feature.
					</Alert.Description>
				</Alert.Root>

				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">4.1 Virtual Currency Nature</h3>
						<ul class="ml-6 list-disc space-y-2">
							<li>All currency (*BUSS, "$", and created coins) is virtual simulation data</li>
							<li>
								Virtual currency has no real-world value and cannot be exchanged for real money
							</li>
							<li>Virtual currency cannot be transferred outside the Platform</li>
							<li>
								We reserve the right to adjust virtual balances for technical or security reasons
							</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">4.2 Trading Mechanics</h3>
						<p class="mb-3">Trading on Rugplay includes realistic mechanics such as:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>
								<strong>Slippage:</strong> Large trades affect prices based on liquidity pool ratios
							</li>
							<li>
								<strong>Market Impact:</strong> Your trades influence coin prices for all users
							</li>
							<li>
								<strong>Liquidity Constraints:</strong> Limited liquidity may prevent large trades
							</li>
							<li>
								<strong>Price Volatility:</strong> Prices fluctuate based on supply and demand
							</li>
						</ul>
					</div>

					<div
						class="rounded-lg border-2 p-4"
						style="border-color: oklch(0.828 0.189 84.429); background-color: oklch(0.828 0.189 84.429 / 0.1);"
					>
						<h3 class="mb-2 text-lg font-medium" style="color: oklch(0.828 0.189 84.429)">
							4.3 Rug Pull Simulation
						</h3>
						<p class="mb-3" style="color: oklch(0.828 0.189 84.429 / 0.8)">
							<strong>You acknowledge and understand that:</strong>
						</p>
						<ul class="ml-6 list-disc space-y-2" style="color: oklch(0.828 0.189 84.429 / 0.8)">
							<li>
								Coin creators and large holders can sell significant portions of their holdings
							</li>
							<li>
								Large sales can drastically reduce coin prices, simulating real rug pull scenarios
							</li>
							<li>This may result in significant virtual losses to your portfolio</li>
							<li>Rug pulls are an intentional educational feature, not a bug or malfunction</li>
							<li>No compensation will be provided for losses due to rug pull events</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">5. User Conduct and Responsibilities</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">5.1 Acceptable Use</h3>
						<p class="mb-3">
							You agree to use Rugplay only for lawful purposes and in accordance with these Terms.
							You will not:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Attempt to gain unauthorized access to other accounts or platform systems</li>
							<li>
								Use automated scripts, bots, or tools to manipulate trading or gain unfair
								advantages.
							</li>
							<li>Create multiple accounts to circumvent platform limitations</li>
							<li>Engage in harassment, abuse, or inappropriate behavior toward other users</li>
							<li>Post spam, offensive content, or content that violates others' rights</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">5.2 Content Responsibility</h3>
						<p class="mb-3">For user-generated content (comments, coin names, descriptions):</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>You retain ownership but grant us license to display and moderate content</li>
							<li>Content must comply with applicable laws and platform guidelines</li>
							<li>We reserve the right to remove content that violates these Terms</li>
							<li>You are responsible for any legal consequences of your content</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">5.3 Trading Conduct</h3>
						<p>While trading, you agree to:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Accept that rug pulls and price manipulation are legitimate platform features</li>
							<li>Not exploit technical bugs or glitches for unfair advantage</li>
							<li>Report security vulnerabilities responsibly</li>
							<li>Understand that all losses are virtual and part of the simulation</li>
						</ul>
					</div>

					<div
						class="rounded-lg border-2 p-4"
						style="border-color: oklch(0.828 0.189 84.429); background-color: oklch(0.828 0.189 84.429 / 0.1);"
					>
						<h3 class="mb-2 text-lg font-medium" style="color: oklch(0.828 0.189 84.429)">
							5.4 Consequences of Violations
						</h3>
						<p class="mb-3" style="color: oklch(0.828 0.189 84.429 / 0.8)">
							<strong>Important: Investment Risk in Prohibited Content</strong>
						</p>
						<p class="mb-3" style="color: oklch(0.828 0.189 84.429 / 0.8)">
							If you invest virtual currency in coins or prediction markets that violate these
							Terms, your investments may be forfeited. This includes:
						</p>
						<ul class="ml-6 list-disc space-y-2" style="color: oklch(0.828 0.189 84.429 / 0.8)">
							<li>Holdings in coins with inappropriate names, symbols, or descriptions</li>
							<li>Bets placed on prediction markets with offensive or prohibited content</li>
							<li>Investments in content that violates intellectual property rights</li>
							<li>Any virtual currency associated with content we remove for Terms violations</li>
						</ul>
						<p class="mt-3" style="color: oklch(0.828 0.189 84.429 / 0.8)">
							<strong>No Compensation:</strong> We will not provide alternative compensation or restore
							virtual balances lost due to investments in prohibited content. You invest at your own
							risk.
						</p>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">6. Prediction Markets</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">6.1 Automated Resolution</h3>
						<p class="mb-3">
							Prediction markets are resolved automatically by AI systems. By participating, you
							acknowledge:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>AI decisions are final and may not always be accurate</li>
							<li>We are not responsible for incorrect AI determinations</li>
							<li>All outcomes affect only virtual currency with no real value</li>
							<li>No manual reviews or appeals are provided for AI decisions</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">6.2 Market Creation</h3>
						<p>Users creating prediction markets must:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Ensure questions are clear and objectively resolvable</li>
							<li>Not attempt to manipulate or exploit AI resolution systems</li>
							<li>Not create markets designed to manipulate or deceive</li>
							<li>Understand that market resolution is beyond their control once created</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">7. Gambling Features (Coinflip and Slots)</h2>

				<Alert.Root class="mb-4">
					<TrendingDown class="h-4 w-4" />
					<Alert.Title>Simulated Gambling Only</Alert.Title>
					<Alert.Description>
						All gambling features use virtual currency (*BUSS) with no real-world value. These are
						entertainment simulations, not real gambling.
					</Alert.Description>
				</Alert.Root>

				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">7.1 Virtual Gambling Games</h3>
						<p class="mb-3">Rugplay includes simulated gambling features:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li><strong>Coinflip:</strong> Binary outcome betting with virtual currency</li>
							<li>
								<strong>Slots:</strong> Multi-reel slot machine simulation with various themes
							</li>
							<li>Other gambling-style games that may be added in the future</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">7.2 Themed Content and Past Projects</h3>
						<p class="mb-3">
							Our gambling features may include themes and references to past projects, including:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Visual themes, characters, or concepts from previous games or projects</li>
							<li>Branded slot machine themes featuring past project assets</li>
							<li>Easter eggs and references to creator's portfolio</li>
							<li>Nostalgic elements for entertainment purposes</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">7.3 Gambling Disclaimers</h3>
						<p class="mb-3">By using gambling features, you acknowledge:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>
								All outcomes are determined by cryptographically secure pseudorandom number
								generation or predetermined algorithms
							</li>
							<li>No real money or real cryptocurrency is involved</li>
							<li>Virtual losses have no real-world financial impact</li>
							<li>Features are for entertainment and educational purposes only</li>
							<li>Source code for random number generation is available for review</li>
							<li>These features are not regulated gambling services</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">7.4 Age Verification for Gambling Features</h3>
						<p class="mb-3">
							By using gambling features (coinflip, slots), you confirm that you are at least 18
							years old in your jurisdiction. This applies even though:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>All currency is virtual with no real-world value</li>
							<li>No real money gambling is involved</li>
							<li>Features are for educational and entertainment purposes only</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">7.5 Responsible Gaming</h3>
						<p class="mb-3">While using virtual currency, we encourage responsible usage:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Set personal limits on time spent using gambling features</li>
							<li>Remember that consistent winning is not guaranteed</li>
							<li>Take breaks if gambling features become less enjoyable</li>
							<li>Focus on the educational aspects of risk and probability</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">8. Platform Availability and Modifications</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">8.1 Service Availability</h3>
						<p>We strive to maintain platform availability but do not guarantee:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Uninterrupted access or error-free operation</li>
							<li>Compatibility with all devices or browsers</li>
							<li>Preservation of data during technical issues</li>
							<li>Advance notice of maintenance or updates</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">8.2 Platform Modifications</h3>
						<p>We reserve the right to:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Modify features, functionality, or user interface</li>
							<li>Adjust virtual currency balances for technical reasons</li>
							<li>Add, remove, or modify trading pairs and coins</li>
							<li>Change platform rules and mechanics with reasonable notice</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">9. Disclaimers and Limitation of Liability</h2>

				<Alert.Root class="mb-4">
					<AlertTriangle class="h-4 w-4" />
					<Alert.Title>Important Legal Disclaimers</Alert.Title>
					<Alert.Description>
						Rugplay is provided "as is" without warranties. We are not liable for virtual losses,
						rug pulls, or any platform-related damages.
					</Alert.Description>
				</Alert.Root>

				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">9.1 No Warranties</h3>
						<p class="mb-3">
							THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
							INCLUDING:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Accuracy, completeness, or reliability of information</li>
							<li>Uninterrupted or error-free operation</li>
							<li>Security from unauthorized access or data breaches</li>
							<li>Compatibility with your devices or expectations</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">9.2 Limitation of Liability</h3>
						<p class="mb-3">TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>
								Virtual currency losses due to rug pulls, market crashes, or trading decisions
							</li>
							<li>Technical failures, data loss, or platform downtime</li>
							<li>Incorrect AI decisions in prediction markets</li>
							<li>Actions of other users or third parties</li>
							<li>Any indirect, incidental, special, consequential, or punitive damages</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">9.3 Educational Purpose</h3>
						<p>Rugplay is designed for educational and entertainment purposes. It is not:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Financial advice or investment guidance</li>
							<li>A substitute for professional financial education</li>
							<li>Representative of real cryptocurrency market conditions</li>
							<li>A guaranteed learning outcome or skill development tool</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">10. Account Termination</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">10.1 Voluntary Termination</h3>
						<p>
							You may delete your account at any time through platform settings. Account deletion:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Is scheduled 14 days after your request</li>
							<li>Can be cancelled during the 14-day period by contacting support</li>
							<li>Results in permanent loss of all virtual currency and account data</li>
							<li>May leave some anonymized data as described in our Privacy Policy</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">10.2 Platform Termination</h3>
						<p>We may suspend or terminate accounts for:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Violation of these Terms</li>
							<li>Suspected fraudulent or abusive behavior</li>
							<li>Technical or security reasons</li>
							<li>Legal or regulatory requirements</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">10.3 Effect of Termination</h3>
						<p>Upon termination:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Your access to the Platform is immediately revoked</li>
							<li>All virtual currency and portfolio holdings are forfeited</li>
							<li>These Terms remain in effect for applicable provisions</li>
							<li>No compensation is provided for lost virtual assets</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">11. Intellectual Property</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">11.1 Platform Ownership</h3>
						<p>Rugplay and all related intellectual property are owned by us, including:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Software, code, algorithms, and technical systems</li>
							<li>Trademarks, logos, and branding</li>
							<li>Platform design, user interface, and user experience</li>
							<li>Trading mechanics and simulation algorithms</li>
							<li>Gambling game mechanics, themes, and visual assets</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">11.2 Past Project Assets and Themes</h3>
						<p class="mb-3">
							Rugplay incorporates intellectual property from creator's past projects, including:
						</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Characters, artwork, and visual themes from previous projects</li>
							<li>Conceptual elements and design philosophies carried forward</li>
							<li>Any derivative works or adaptations of existing intellectual property</li>
						</ul>
						<p class="text-muted-foreground mt-3 text-sm">
							All past project assets used in Rugplay are owned by the platform creators or used
							with proper authorization.
						</p>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">11.3 User Content</h3>
						<p>For content you create (comments, coin descriptions), you:</p>
						<ul class="ml-6 list-disc space-y-2">
							<li>Retain ownership of your original content</li>
							<li>Grant us a license to display, store, and moderate content</li>
							<li>Ensure you have rights to any content you post</li>
							<li>Cannot use content that infringes others' rights</li>
						</ul>
					</div>
				</div>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">12. Privacy and Data</h2>
				<p class="mb-4">
					Your privacy is important to us. Our data collection and processing practices are detailed
					in our Privacy Policy, which is incorporated into these Terms by reference.
				</p>
				<p>
					By using Rugplay, you consent to our data practices as described in the Privacy Policy,
					including the retention of anonymized data after account deletion.
				</p>
			</Card.Content>

			<Card.Content>
				<h2 class="mb-4 text-2xl font-semibold">13. Miscellaneous</h2>
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-medium">13.1 Entire Agreement</h3>
						<p>
							These Terms, along with our Privacy Policy, constitute the entire agreement between
							you and Rugplay regarding use of the Platform.
						</p>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">13.2 Severability</h3>
						<p>
							If any provision of these Terms is found unenforceable, the remaining provisions will
							continue in full force and effect.
						</p>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">13.3 Updates to Terms</h3>
						<p>
							We may update these Terms periodically. Material changes will be communicated via
							email and platform notifications. Continued use after changes constitutes acceptance.
						</p>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium">13.4 Contact Information</h3>
						<p>
							For questions about these Terms, contact us at:
							<a href="mailto:{CONTACT_EMAIL}" class="text-primary underline">{CONTACT_EMAIL}</a>
						</p>
					</div>
				</div>
			</Card.Content>

			<div class="rounded-lg p-4 text-sm" style="background-color: oklch(var(--primary) / 0.1);">
				<p class="mb-2"><strong>Last Updated:</strong> {LAST_UPDATED}</p>
				<p class="mb-2">
					<strong>Contact:</strong>
					<a href="mailto:{CONTACT_EMAIL}" class="text-primary underline">{CONTACT_EMAIL}</a>
				</p>
				<p class="mb-2"><strong>Platform:</strong> Rugplay</p>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex justify-center gap-4">
			<Button variant="outline" size="lg" onclick={() => goto('/legal/privacy')}>
				Privacy Policy →
			</Button>
		</div>
	</Card.Root>
</div>
