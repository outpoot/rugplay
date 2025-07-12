<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="grid gap-4 md:gap-6 xl:grid-cols-2">
    <div class="flex flex-col xl:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each Array(9) as _}
                <div class="flex items-start gap-2 rounded-md border border-border bg-muted/50 transition ease duration-200 p-4">
                    <Skeleton class="h-14 w-14 rounded-full mr-2" />
                    <div class="flex flex-col flex-grow gap-2">
                        <Skeleton class="h-5 w-32 md:h-5 md:w-40" />
                        <Skeleton class="h-5 w-12 md:h-5 md:w-24" />
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                                <Skeleton class="h-5 w-12 md:h-5 md:w-20" />
                                <Skeleton class="h-5 w-12 md:h-5 md:w-20" />
                            </div>
                            <div class="flex items-center justify-between">
                                <Skeleton class="h-5 w-12 md:h-5 md:w-20" />
                                <Skeleton class="h-5 w-12 md:h-5 md:w-20" />
                            </div>
                            <Skeleton class="h-5 w-20 md:h-5 md:w-32" />
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
