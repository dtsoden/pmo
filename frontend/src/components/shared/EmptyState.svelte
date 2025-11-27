<script lang="ts">
  import { cn } from '$lib/utils';

  export let title = 'No data';
  export let description = '';
  let className = '';
  export { className as class };
</script>

<div class={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
  {#if $$slots.icon}
    <div class="mb-4 text-muted-foreground">
      <slot name="icon" />
    </div>
  {/if}
  <h3 class="text-lg font-medium">{title}</h3>
  {#if description}
    <p class="mt-1 text-sm text-muted-foreground">{description}</p>
  {/if}
  {#if $$slots.action}
    <div class="mt-4">
      <slot name="action" />
    </div>
  {/if}
</div>
