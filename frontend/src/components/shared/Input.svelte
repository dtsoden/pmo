<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface $$Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
    class?: string;
  }

  export let label = '';
  export let error = '';
  export let value: string | number = '';
  let className = '';
  export { className as class };
</script>

<div class="space-y-1.5">
  {#if label}
    <label class="text-sm font-medium leading-none" for={$$restProps.id}>
      {label}
      {#if $$restProps.required}
        <span class="text-destructive">*</span>
      {/if}
    </label>
  {/if}
  <input
    {...$$restProps}
    bind:value
    class={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
      'ring-offset-background placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-destructive focus-visible:ring-destructive',
      className
    )}
    on:input
    on:change
    on:blur
    on:focus
  />
  {#if error}
    <p class="text-sm text-destructive">{error}</p>
  {/if}
</div>
