<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Option {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface $$Props extends HTMLSelectAttributes {
    label?: string;
    error?: string;
    options: Option[];
    placeholder?: string;
    class?: string;
  }

  export let label = '';
  export let error = '';
  export let options: Option[] = [];
  export let placeholder = 'Select...';
  export let value: string = '';
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
  <select
    {...$$restProps}
    bind:value
    class={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
      'ring-offset-background placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-destructive focus:ring-destructive',
      className
    )}
    on:change
    on:blur
  >
    {#if placeholder}
      <option value="" disabled selected={!value}>{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
  </select>
  {#if error}
    <p class="text-sm text-destructive">{error}</p>
  {/if}
</div>
