<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Client } from '$lib/api/client';
  import { Card, Button, Badge, Input, Spinner, EmptyState } from '$components/shared';
  import { cn, debounce } from '$lib/utils';
  import { Plus, Search, Building2, Globe, MapPin } from 'lucide-svelte';
  import ClientForm from './ClientForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let clients: Client[] = [];
  let loading = true;
  let error = '';

  // Filters
  let search = '';

  // Pagination
  let page = 1;
  let limit = 10;
  let total = 0;
  let totalPages = 0;

  // Modal
  let showCreateModal = false;

  async function loadClients() {
    loading = true;
    error = '';

    try {
      const response = await api.clients.list({
        page,
        limit,
        search: search || undefined,
      });

      clients = response.data || [];
      total = response.total || 0;
      totalPages = response.totalPages || 0;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load clients';
    } finally {
      loading = false;
    }
  }

  const debouncedSearch = debounce(() => {
    page = 1;
    loadClients();
  }, 300);

  onMount(loadClients);

  function handleSearchInput() {
    debouncedSearch();
  }

  function handleClientCreated() {
    showCreateModal = false;
    loadClients();
  }
</script>

<svelte:head>
  <title>Clients - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Clients</h1>
      <p class="text-muted-foreground">Manage your client relationships</p>
    </div>
    <Button on:click={() => (showCreateModal = true)}>
      <Plus class="h-4 w-4" />
      New Client
    </Button>
  </div>

  <!-- Search -->
  <Card class="p-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search clients..."
        class="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={search}
        on:input={handleSearchInput}
      />
    </div>
  </Card>

  <!-- Clients Grid -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadClients}>Retry</Button>
      </div>
    </Card>
  {:else if clients.length === 0}
    <Card>
      <EmptyState
        title="No clients found"
        description={search
          ? 'Try adjusting your search'
          : 'Get started by adding your first client'}
      >
        <svelte:fragment slot="icon">
          <Building2 class="h-12 w-12" />
        </svelte:fragment>
        <svelte:fragment slot="action">
          {#if !search}
            <Button on:click={() => (showCreateModal = true)}>
              <Plus class="h-4 w-4" />
              New Client
            </Button>
          {/if}
        </svelte:fragment>
      </EmptyState>
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each clients as client}
        <Card class="transition-shadow hover:shadow-md">
          <a href="/clients/{client.id}" class="block p-6">
            <div class="flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 class="h-6 w-6" />
              </div>
              <Badge variant={client.isActive ? 'success' : 'default'}>
                {client.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <h3 class="mt-4 text-lg font-semibold">{client.name}</h3>
            {#if client.industry}
              <p class="mt-1 text-sm text-muted-foreground">{client.industry}</p>
            {/if}
            <div class="mt-4 space-y-2 text-sm text-muted-foreground">
              {#if client.website}
                <div class="flex items-center gap-2">
                  <Globe class="h-4 w-4" />
                  <span class="truncate">{client.website}</span>
                </div>
              {/if}
              {#if client.address}
                <div class="flex items-center gap-2">
                  <MapPin class="h-4 w-4" />
                  <span class="truncate">{client.address}</span>
                </div>
              {/if}
            </div>
            {#if client._count}
              <div class="mt-4 flex gap-4 border-t pt-4 text-sm text-muted-foreground">
                <span>{client._count.projects || 0} projects</span>
                <span>{client._count.contacts || 0} contacts</span>
              </div>
            {/if}
          </a>
        </Card>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} clients
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            on:click={() => {
              page--;
              loadClients();
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            on:click={() => {
              page++;
              loadClients();
            }}
          >
            Next
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Create Client Modal -->
<ClientForm
  bind:open={showCreateModal}
  on:success={handleClientCreated}
/>
