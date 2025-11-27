<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let checked = false;
  export let disabled = false;
  export let id = '';
  export let label = '';
  export let description = '';

  const dispatch = createEventDispatcher();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    dispatch('change', checked);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<div class="flex items-center justify-between gap-4">
  {#if label || description}
    <div class="flex-1">
      {#if label}
        <label for={id} class="text-sm font-medium cursor-pointer" on:click={toggle}>
          {label}
        </label>
      {/if}
      {#if description}
        <p class="text-xs text-muted-foreground">{description}</p>
      {/if}
    </div>
  {/if}

  <button
    type="button"
    role="switch"
    aria-checked={checked}
    {id}
    {disabled}
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    class:bg-primary={checked}
    class:bg-input={!checked}
    on:click={toggle}
    on:keydown={handleKeydown}
  >
    <span
      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out"
      class:translate-x-5={checked}
      class:translate-x-0={!checked}
    />
  </button>
</div>
