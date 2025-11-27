<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { api, type Client, type ClientContact, type Project } from '$lib/api/client';
  import { Card, Button, Badge, Spinner, EmptyState, Modal } from '$components/shared';
  import {
    formatDate,
    getProjectStatusVariant,
    PROJECT_STATUS_LABELS,
  } from '$lib/utils';
  import {
    ArrowLeft,
    Edit,
    Trash2,
    Plus,
    Building2,
    Globe,
    MapPin,
    Mail,
    Phone,
    User,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import ClientForm from '../ClientForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  const clientId = $page?.params?.id ?? '';

  let client: Client | null = null;
  let contacts: ClientContact[] = [];
  let projects: Project[] = [];
  let loading = true;
  let error = '';

  let showEditModal = false;
  let showDeleteModal = false;
  let deleting = false;

  async function loadClient() {
    loading = true;
    error = '';

    try {
      const [clientData, contactsData, projectsRes] = await Promise.all([
        api.clients.get(clientId),
        api.clients.contacts.list(clientId),
        api.projects.list({ clientId, limit: 100 }),
      ]);

      client = clientData;
      contacts = contactsData || [];
      projects = projectsRes.data || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load client';
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    deleting = true;

    try {
      await api.clients.delete(clientId);
      toast.success('Client deleted successfully');
      if (browser) {
        window.location.href = '/clients';
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete client');
    } finally {
      deleting = false;
      showDeleteModal = false;
    }
  }

  function handleClientUpdated() {
    showEditModal = false;
    loadClient();
  }

  onMount(loadClient);
</script>

<svelte:head>
  <title>{client?.name || 'Client'} - PMO</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if error}
  <Card class="p-6">
    <p class="text-center text-destructive">{error}</p>
    <div class="mt-4 text-center">
      <Button variant="outline" on:click={loadClient}>Retry</Button>
    </div>
  </Card>
{:else if client}
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <a
          href="/clients"
          class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to Clients
        </a>
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold">{client.name}</h1>
            {#if client.industry}
              <p class="text-muted-foreground">{client.industry}</p>
            {/if}
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" on:click={() => (showEditModal = true)}>
          <Edit class="h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" on:click={() => (showDeleteModal = true)}>
          <Trash2 class="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Projects -->
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Projects ({projects.length})</h2>
            <Button size="sm" href="/projects?clientId={clientId}">View All</Button>
          </div>
          <div class="divide-y">
            {#if projects.length === 0}
              <EmptyState
                title="No projects"
                description="No projects have been created for this client"
                class="py-8"
              />
            {:else}
              {#each projects.slice(0, 5) as project}
                <a
                  href="/projects/{project.id}"
                  class="flex items-center justify-between px-6 py-4 hover:bg-muted/50"
                >
                  <div>
                    <p class="font-medium">{project.name}</p>
                    <p class="text-sm text-muted-foreground">{project.code}</p>
                  </div>
                  <Badge variant={getProjectStatusVariant(project.status)}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </a>
              {/each}
            {/if}
          </div>
        </Card>

        <!-- Contacts -->
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Contacts ({contacts.length})</h2>
            <Button size="sm" variant="outline">
              <Plus class="h-4 w-4" />
              Add Contact
            </Button>
          </div>
          <div class="divide-y">
            {#if contacts.length === 0}
              <EmptyState
                title="No contacts"
                description="Add contacts for this client"
                class="py-8"
              />
            {:else}
              {#each contacts as contact}
                <div class="flex items-center justify-between px-6 py-4">
                  <div class="flex items-center gap-4">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User class="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p class="font-medium">
                        {contact.firstName} {contact.lastName}
                        {#if contact.isPrimary}
                          <Badge variant="info" class="ml-2">Primary</Badge>
                        {/if}
                      </p>
                      {#if contact.title}
                        <p class="text-sm text-muted-foreground">{contact.title}</p>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-4 text-sm text-muted-foreground">
                    {#if contact.email}
                      <a href="mailto:{contact.email}" class="flex items-center gap-1 hover:text-foreground">
                        <Mail class="h-4 w-4" />
                        {contact.email}
                      </a>
                    {/if}
                    {#if contact.phone}
                      <a href="tel:{contact.phone}" class="flex items-center gap-1 hover:text-foreground">
                        <Phone class="h-4 w-4" />
                        {contact.phone}
                      </a>
                    {/if}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </Card>

      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Details -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Details</h2>
          </div>
          <div class="space-y-4 p-4">
            {#if client.website}
              <div class="flex items-center gap-3">
                <Globe class="h-5 w-5 text-muted-foreground" />
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-primary hover:underline"
                >
                  {client.website}
                </a>
              </div>
            {/if}
            {#if client.addressLine1 || client.city || client.country}
              <div class="flex gap-3">
                <MapPin class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div class="text-sm">
                  {#if client.addressLine1}<div>{client.addressLine1}</div>{/if}
                  {#if client.addressLine2}<div>{client.addressLine2}</div>{/if}
                  {#if client.city || client.stateProvince || client.postalCode}
                    <div>
                      {[client.city, client.stateProvince, client.postalCode].filter(Boolean).join(', ')}
                    </div>
                  {/if}
                  {#if client.country}<div>{client.country}</div>{/if}
                </div>
              </div>
            {/if}
            {#if client.primaryContactName || client.primaryContactEmail || client.primaryContactPhone}
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground uppercase">Primary Contact</p>
                {#if client.primaryContactName}
                  <div class="flex items-center gap-3">
                    <User class="h-4 w-4 text-muted-foreground" />
                    <span class="text-sm">{client.primaryContactName}</span>
                  </div>
                {/if}
                {#if client.primaryContactEmail}
                  <div class="flex items-center gap-3">
                    <Mail class="h-4 w-4 text-muted-foreground" />
                    <a href="mailto:{client.primaryContactEmail}" class="text-sm text-primary hover:underline">
                      {client.primaryContactEmail}
                    </a>
                  </div>
                {/if}
                {#if client.primaryContactPhone}
                  <div class="flex items-center gap-3">
                    <Phone class="h-4 w-4 text-muted-foreground" />
                    <a href="tel:{client.primaryContactPhone}" class="text-sm hover:text-primary">
                      {client.primaryContactPhone}
                    </a>
                  </div>
                {/if}
              </div>
            {/if}
            <div class="border-t pt-4">
              <Badge variant={client.status === 'ACTIVE' ? 'success' : 'default'}>
                {client.status === 'ACTIVE' ? 'Active' : client.status === 'PROSPECT' ? 'Prospect' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </Card>

        <!-- Notes -->
        {#if client.notes}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Notes</h2>
            </div>
            <div class="p-4">
              <p class="whitespace-pre-wrap text-sm text-muted-foreground">{client.notes}</p>
            </div>
          </Card>
        {/if}

        <!-- Salesforce Info -->
        {#if client.salesforceAccountId || client.salesforceAccountName}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Salesforce</h2>
            </div>
            <div class="space-y-2 p-4 text-sm">
              {#if client.salesforceAccountId}
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Account ID</span>
                  <span class="font-mono">{client.salesforceAccountId}</span>
                </div>
              {/if}
              {#if client.salesforceAccountName}
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Account Name</span>
                  <span>{client.salesforceAccountName}</span>
                </div>
              {/if}
            </div>
          </Card>
        {/if}

        <!-- Metadata -->
        <Card>
          <div class="space-y-2 p-4 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Created</span>
              <span>{formatDate(client.createdAt)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Last Updated</span>
              <span>{formatDate(client.updatedAt)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <ClientForm
    bind:open={showEditModal}
    {client}
    on:success={handleClientUpdated}
  />

  <!-- Delete Confirmation Modal -->
  <Modal bind:open={showDeleteModal} title="Delete Client" size="sm">
    <p class="text-muted-foreground">
      Are you sure you want to delete <strong>{client.name}</strong>? This action cannot be undone.
    </p>
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => (showDeleteModal = false)}>
          Cancel
        </Button>
        <Button variant="destructive" loading={deleting} on:click={handleDelete}>
          Delete Client
        </Button>
      </div>
    </svelte:fragment>
  </Modal>
{/if}
