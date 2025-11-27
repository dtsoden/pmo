<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type DropdownLists } from '$lib/api/client';
  import { Card, Button, Spinner } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { Plus, Trash2, GripVertical } from 'lucide-svelte';

  // SvelteKit props
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let dropdowns: DropdownLists | null = null;
  let loading = true;
  let error = '';


  // New item inputs
  let newItems: Record<string, string> = {
    industries: '',
    projectTypes: '',
    skillCategories: '',
    departments: '',
    regions: '',
  };

  const listLabels: Record<string, string> = {
    industries: 'Industries',
    projectTypes: 'Project Types',
    skillCategories: 'Skill Categories',
    departments: 'Departments',
    regions: 'Regions',
  };

  async function loadDropdowns() {
    loading = true;
    error = '';
    try {
      dropdowns = await api.admin.dropdowns.getAll();
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load dropdown lists';
    } finally {
      loading = false;
    }
  }

  onMount(loadDropdowns);

  async function addItem(listName: string) {
    if (!dropdowns || !newItems[listName].trim()) return;

    const value = newItems[listName].trim();
    const key = listName as keyof Omit<DropdownLists, 'updatedAt'>;
    const list = dropdowns[key] as string[];

    if (list.includes(value)) {
      toast.error(`"${value}" already exists`);
      return;
    }

    // Auto-save: add and persist immediately
    const newList = [...list, value];
    try {
      await api.admin.dropdowns.update(listName, newList);
      dropdowns = { ...dropdowns, [key]: newList };
      newItems[listName] = '';
      toast.success(`Added "${value}"`);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to add item');
    }
  }

  async function removeItem(listName: string, index: number) {
    if (!dropdowns) return;

    const key = listName as keyof Omit<DropdownLists, 'updatedAt'>;
    const list = [...(dropdowns[key] as string[])];
    const removed = list[index];
    list.splice(index, 1);

    // Auto-save: remove and persist immediately
    try {
      await api.admin.dropdowns.update(listName, list);
      dropdowns = { ...dropdowns, [key]: list };
      toast.success(`Removed "${removed}"`);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove item');
    }
  }

  async function moveItem(listName: string, fromIndex: number, toIndex: number) {
    if (!dropdowns) return;

    const key = listName as keyof Omit<DropdownLists, 'updatedAt'>;
    const list = [...(dropdowns[key] as string[])];
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);

    // Auto-save: reorder and persist immediately
    try {
      await api.admin.dropdowns.update(listName, list);
      dropdowns = { ...dropdowns, [key]: list };
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reorder');
    }
  }

  function handleKeydown(event: KeyboardEvent, listName: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addItem(listName);
    }
  }
</script>

<svelte:head>
  <title>Dropdown Lists - Admin - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Dropdown Lists</h1>
    <p class="text-muted-foreground">Manage dropdown options used throughout the application</p>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadDropdowns}>Retry</Button>
      </div>
    </Card>
  {:else if dropdowns}
    <div class="grid gap-6 lg:grid-cols-2">
      {#each Object.entries(listLabels) as [listName, label]}
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">{label}</h2>
          </div>
          <div class="p-4 space-y-3">
            <!-- Add new item -->
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="Add new item..."
                class="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                bind:value={newItems[listName]}
                on:keydown={(e) => handleKeydown(e, listName)}
              />
              <Button size="sm" variant="outline" on:click={() => addItem(listName)}>
                <Plus class="h-4 w-4" />
              </Button>
            </div>

            <!-- List items -->
            <div class="space-y-1 max-h-64 overflow-y-auto">
              {#each (dropdowns?.[listName] || []) as item, index (item)}
                <div class="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group">
                  <button
                    type="button"
                    class="cursor-grab text-muted-foreground hover:text-foreground"
                    title="Drag to reorder"
                    on:click={() => {
                      if (index > 0) moveItem(listName, index, index - 1);
                    }}
                  >
                    <GripVertical class="h-4 w-4" />
                  </button>
                  <span class="flex-1 text-sm">{item}</span>
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                    on:click={() => removeItem(listName, index)}
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              {:else}
                <p class="text-sm text-muted-foreground text-center py-4">No items yet</p>
              {/each}
            </div>

            <p class="text-xs text-muted-foreground">
              {(dropdowns?.[listName] || []).length} items
            </p>
          </div>
        </Card>
      {/each}
    </div>

    {#if dropdowns.updatedAt}
      <p class="text-sm text-muted-foreground text-center">
        Last updated: {new Date(dropdowns.updatedAt).toLocaleString()}
      </p>
    {/if}
  {/if}
</div>
