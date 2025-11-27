<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type User, type Role } from '$lib/api/client';
  import { Card, Button, Badge, Avatar, Input, Select, Spinner, EmptyState, Modal } from '$components/shared';
  import { cn, fullName, debounce, ROLE_LABELS, getTimezoneAbbreviation } from '$lib/utils';
  import { Search, Users, Mail, Phone } from 'lucide-svelte';
  import UserForm from './UserForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let users: User[] = [];
  let loading = true;
  let error = '';

  // Filters
  let search = '';
  let roleFilter = '';

  // Pagination
  let page = 1;
  let limit = 12;
  let total = 0;
  let totalPages = 0;

  // Modal state
  let showEditModal = false;
  let selectedUser: User | null = null;


  async function loadUsers() {
    loading = true;
    error = '';

    try {
      const response = await api.users.list({
        page,
        limit,
        search: search || undefined,
      });

      // Filter by role if needed (client-side for now)
      let filteredUsers = response.data || [];
      if (roleFilter) {
        filteredUsers = filteredUsers.filter((u) => u.role === roleFilter);
      }

      users = filteredUsers;
      total = response.total || 0;
      totalPages = response.totalPages || 0;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load team members';
    } finally {
      loading = false;
    }
  }

  const debouncedSearch = debounce(() => {
    page = 1;
    loadUsers();
  }, 300);

  onMount(loadUsers);

  function handleSearchInput() {
    debouncedSearch();
  }

  function handleFilterChange() {
    page = 1;
    loadUsers();
  }

  function openEditModal(user: User) {
    selectedUser = user;
    showEditModal = true;
  }

  function handleUserUpdated() {
    showEditModal = false;
    selectedUser = null;
    loadUsers();
  }

  function getRoleBadgeVariant(role: Role) {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'error';
      case 'PMO_MANAGER':
      case 'PROJECT_MANAGER':
        return 'info';
      case 'RESOURCE_MANAGER':
        return 'warning';
      default:
        return 'default';
    }
  }

  const roleOptions = [
    { value: '', label: 'All Roles' },
    ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
  ];
</script>

<svelte:head>
  <title>People - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">People</h1>
      <p class="text-muted-foreground">View and manage team member information</p>
    </div>
  </div>

  <!-- Filters -->
  <Card class="p-4">
    <div class="flex flex-col gap-4 md:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          class="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={search}
          on:input={handleSearchInput}
        />
      </div>
      <Select
        options={roleOptions}
        bind:value={roleFilter}
        on:change={handleFilterChange}
        class="w-48"
      />
    </div>
  </Card>

  <!-- Team Grid -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadUsers}>Retry</Button>
      </div>
    </Card>
  {:else if users.length === 0}
    <Card>
      <EmptyState
        title="No team members found"
        description={search || roleFilter
          ? 'Try adjusting your filters'
          : 'Get started by adding team members'}
      >
        <svelte:fragment slot="icon">
          <Users class="h-12 w-12" />
        </svelte:fragment>
        <svelte:fragment slot="action">
          <!-- Add users in Admin > User Management -->
        </svelte:fragment>
      </EmptyState>
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each users as user}
        <a href="/people/{user.id}" class="block">
          <Card class="transition-shadow hover:shadow-md cursor-pointer h-full">
            <div class="block p-6">
            <div class="flex flex-col items-center text-center">
              <Avatar
                firstName={user.firstName}
                lastName={user.lastName}
                src={user.avatarUrl}
                size="lg"
              />
              <h3 class="mt-4 font-semibold">
                {fullName(user.firstName, user.lastName)}
              </h3>
              {#if user.jobTitle}
                <p class="text-sm text-muted-foreground">{user.jobTitle}</p>
              {/if}
              <div class="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Badge variant="default">
                  {getTimezoneAbbreviation(user.timezone)}
                </Badge>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                {#if user.status !== 'ACTIVE'}
                  <Badge variant="default">Inactive</Badge>
                {/if}
              </div>
            </div>
            <div class="mt-4 space-y-2 border-t pt-4 text-sm text-muted-foreground">
              <div class="flex items-center gap-2">
                <Mail class="h-4 w-4" />
                <span class="truncate">{user.email}</span>
              </div>
              {#if user.phone}
                <div class="flex items-center gap-2">
                  <Phone class="h-4 w-4" />
                  <span>{user.phone}</span>
                </div>
              {/if}
              {#if user.department}
                <div class="text-center">
                  <span class="text-xs">{user.department}</span>
                </div>
              {/if}
            </div>
          </div>
        </Card>
        </a>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} members
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            on:click={() => {
              page--;
              loadUsers();
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
              loadUsers();
            }}
          >
            Next
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Edit User Modal -->
<UserForm
  bind:open={showEditModal}
  user={selectedUser}
  on:success={handleUserUpdated}
/>
