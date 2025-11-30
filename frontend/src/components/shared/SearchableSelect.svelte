<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { Search, X, ChevronDown, Loader2 } from 'lucide-svelte';
  import { cn } from '$lib/utils';

  // Props
  export let value = ''; // Selected item ID
  export let placeholder = 'Search...';
  export let disabled = false;
  export let error = '';
  export let label = '';
  export let required = false;
  export let items: any[] = []; // Array of items to display
  export let loading = false;
  export let displayField = 'name'; // Field to display in dropdown
  export let valueField = 'id'; // Field to use as value
  export let secondaryField = ''; // Optional secondary field (e.g., email)
  export let noResultsText = 'No results found';
  export let minSearchLength = 0; // Minimum characters before searching
  export let showSearchHint = true; // Show hint when no search and many items

  // Internal state
  let searchQuery = '';

  const dispatch = createEventDispatcher<{
    search: { query: string };
    select: { value: string; item: any };
    clear: void;
  }>();

  let isOpen = false;
  let inputElement: HTMLInputElement;
  let dropdownElement: HTMLDivElement;

  $: selectedItem = items.find((item) => item[valueField] === value);
  $: displayText = selectedItem
    ? secondaryField && selectedItem[secondaryField]
      ? `${selectedItem[displayField]} (${selectedItem[secondaryField]})`
      : selectedItem[displayField]
    : '';

  function handleInputBlur(event: FocusEvent) {
    // Close dropdown unless clicking within dropdown
    setTimeout(() => {
      if (!dropdownElement?.contains(event.relatedTarget as Node)) {
        isOpen = false;
      }
    }, 150);
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    searchQuery = newValue;
    dispatch('search', { query: newValue });
  }

  function selectItem(item: any) {
    value = item[valueField];
    searchQuery = '';
    isOpen = false;
    dispatch('select', { value: item[valueField], item });
  }

  function handleInputFocus() {
    isOpen = true;
  }

  function clearSelection() {
    value = '';
    searchQuery = '';
    dispatch('clear');
    inputElement?.focus();
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      inputElement &&
      !inputElement.contains(event.target as Node) &&
      dropdownElement &&
      !dropdownElement.contains(event.target as Node)
    ) {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  $: shouldShowHint =
    showSearchHint && !searchQuery && items.length === 0 && !loading && minSearchLength > 0;
</script>

<div class="relative w-full">
  {#if label}
    <label class="mb-1.5 block text-sm font-medium">
      {label}
      {#if required}
        <span class="text-destructive">*</span>
      {/if}
    </label>
  {/if}

  <div class="relative">
    <!-- Selected item display or search input -->
    {#if value && selectedItem && !isOpen}
      <div
        class={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-destructive'
        )}
      >
        <span class="flex-1 truncate">{displayText}</span>
        <div class="flex items-center gap-1">
          {#if !disabled}
            <button
              type="button"
              class="rounded p-0.5 hover:bg-muted"
              on:click={clearSelection}
              aria-label="Clear selection"
            >
              <X class="h-4 w-4" />
            </button>
          {/if}
          <ChevronDown class="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    {:else}
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          bind:this={inputElement}
          type="text"
          class={cn(
            'h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            disabled && 'cursor-not-allowed opacity-50',
            error && 'border-destructive'
          )}
          {placeholder}
          {disabled}
          bind:value={searchQuery}
          on:input={handleSearchInput}
          on:focus={handleInputFocus}
          on:blur={handleInputBlur}
        />
        {#if loading}
          <Loader2 class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        {:else if searchQuery}
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
            on:click={() => {
              searchQuery = '';
              dispatch('search', { query: '' });
            }}
            aria-label="Clear search"
          >
            <X class="h-4 w-4" />
          </button>
        {:else}
          <ChevronDown class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {/if}
      </div>
    {/if}

    <!-- Dropdown -->
    {#if isOpen}
      <div
        bind:this={dropdownElement}
        class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-popover shadow-lg"
      >
        {#if loading}
          <div class="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </div>
        {:else if shouldShowHint}
          <div class="p-4 text-center text-sm text-muted-foreground">
            Type at least {minSearchLength} character{minSearchLength > 1 ? 's' : ''} to search
          </div>
        {:else if items.length === 0}
          <div class="p-4 text-center text-sm text-muted-foreground">
            {noResultsText}
          </div>
        {:else}
          <div class="py-1">
            {#each items as item}
              <button
                type="button"
                class={cn(
                  'flex w-full items-start px-3 py-2 text-left text-sm hover:bg-accent',
                  value === item[valueField] && 'bg-accent'
                )}
                on:click={() => selectItem(item)}
              >
                <div class="flex-1">
                  <div class="font-medium">{item[displayField]}</div>
                  {#if secondaryField && item[secondaryField]}
                    <div class="text-xs text-muted-foreground">{item[secondaryField]}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if error}
    <p class="mt-1 text-xs text-destructive">{error}</p>
  {/if}
</div>
