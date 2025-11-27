<script lang="ts">
  import { cn } from '$lib/utils';
  import { X } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let open = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  let className = '';
  export { className as class };

  const dispatch = createEventDispatcher();

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  function close() {
    open = false;
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    transition:fade={{ duration: 150 }}
    on:click={handleBackdropClick}
  >
    <div
      class={cn(
        'relative w-full rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl max-h-[calc(100vh-2rem)] flex flex-col',
        sizes[size],
        className
      )}
      transition:scale={{ duration: 150, start: 0.95 }}
      on:wheel|stopPropagation
      on:touchmove|stopPropagation
    >
      <div class="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold">{title}</h2>
          {#if $$slots['header-extra']}
            <slot name="header-extra" />
          {/if}
        </div>
        <button
          type="button"
          class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          on:click={close}
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </button>
      </div>
      <div class="px-6 py-4 overflow-y-auto flex-grow overscroll-contain">
        <slot />
      </div>
      {#if $$slots.footer}
        <div class="border-t px-6 py-4 flex-shrink-0">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
