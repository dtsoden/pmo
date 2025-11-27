<script lang="ts">
  import { cn } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';

  let className = '';
  export { className as class };

  const dispatch = createEventDispatcher();

  function handleClick(e: MouseEvent) {
    dispatch('click', e);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div
  class={cn(
    'rounded-lg border bg-card text-card-foreground shadow-sm',
    className
  )}
  on:click={handleClick}
>
  <slot />
</div>
