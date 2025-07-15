<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="grid gap-4 md:gap-6 xl:grid-cols-2">
    <div class="flex flex-col xl:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each Array(9) as _}
                <Card.Root class="gap-1">
                    <Card.Content>
                        <div class="flex items-start gap-4">
                            <Skeleton class="h-12 w-12 rounded-full shrink-0" />
                            <div class="flex flex-col flex-grow gap-2">
                                <Skeleton class="h-4 w-32 md:h-4 md:w-40" />
                                <Skeleton class="h-4 w-20 md:h-4 md:w-24" />
                                <div class="flex flex-col gap-1 mt-2">
                                    <div class="flex items-center justify-between">
                                        <Skeleton class="h-3 w-16 md:h-3 md:w-20" />
                                        <Skeleton class="h-4 w-16 md:h-4 md:w-20" />
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <Skeleton class="h-3 w-12 md:h-3 md:w-16" />
                                        <Skeleton class="h-4 w-16 md:h-4 md:w-20" />
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 mt-2">
                                    <Skeleton class="h-4 w-4" />
                                    <Skeleton class="h-3 w-24 md:h-3 md:w-32" />
                                </div>
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>
    </div>
</div>
