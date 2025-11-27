<script lang="ts">
  import { cn } from '$lib/utils';
  import { Calendar } from 'lucide-svelte';

  export let id = '';
  export let label = '';
  export let value = '';
  export let error = '';
  export let required = false;
  export let disabled = false;
  export let min = '';
  export let max = '';
  let className = '';
  export { className as class };

  let inputEl: HTMLInputElement;

  function openPicker() {
    if (disabled) return;
    // Try to show the native date picker
    if (inputEl?.showPicker) {
      inputEl.showPicker();
    } else {
      // Fallback: focus the input
      inputEl?.focus();
    }
  }

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
</script>

<div class="space-y-1.5">
  {#if label}
    <label class="text-sm font-medium leading-none" for={id}>
      {label}
      {#if required}
        <span class="text-destructive">*</span>
      {/if}
    </label>
  {/if}

  <div class="relative">
    <!-- Hidden native date input -->
    <input
      bind:this={inputEl}
      bind:value
      type="date"
      {id}
      {required}
      {disabled}
      {min}
      {max}
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      on:change
      on:input
    />

    <!-- Visible styled button -->
    <button
      type="button"
      {disabled}
      on:click={openPicker}
      class={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
        'ring-offset-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:bg-muted/50 transition-colors',
        error && 'border-destructive focus-visible:ring-destructive',
        !value && 'text-muted-foreground',
        className
      )}
    >
      <span class="truncate">
        {value ? formatDisplayDate(value) : 'Select date...'}
      </span>
      <Calendar class="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  </div>

  {#if error}
    <p class="text-sm text-destructive">{error}</p>
  {/if}
</div>
