<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type User, type Role } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Card, CardContent, CardHeader, CardTitle } from '$components/ui/card';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Spinner, Avatar } from '$components/shared';
  import {
    Search,
    Plus,
    AlertCircle,
    Mail,
  } from 'lucide-svelte';
  import { fullName, ROLE_LABELS } from '$lib/utils';
  import AdminUserForm from './AdminUserForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let users: User[] = [];
  let loading = true;
  let error: string | null = null;
  let searchTerm = '';
  let showCreateModal = false;
  let showEditModal = false;
  let selectedUser: User | null = null;

  $: filteredUsers = (users || []).filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      user.firstName.toLowerCase().includes(search) ||
      user.lastName.toLowerCase().includes(search)
    );
  });

  onMount(async () => {
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }

    await loadUsers();
  });

  async function loadUsers() {
    loading = true;
    error = null;
    try {
      const response = await api.users.list({ limit: 100 });
      users = response.data || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  function handleUserCreated() {
    showCreateModal = false;
    loadUsers();
  }

  function handleUserUpdated() {
    showEditModal = false;
    selectedUser = null;
    loadUsers();
  }

  function openEditModal(user: User) {
    selectedUser = user;
    showEditModal = true;
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

  function getStatusBadgeVariant(status: string | undefined) {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'error';
      case 'INACTIVE':
      case 'PENDING':
      default:
        return 'default';
    }
  }
</script>

<svelte:head>
  <title>User Management - Admin - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">User Management</h1>
      <p class="text-muted-foreground">Manage user accounts, roles, and security settings</p>
    </div>
    <Button on:click={() => (showCreateModal = true)}>
      <Plus class="h-4 w-4" />
      Add User
    </Button>
  </div>

  <!-- Search -->
  <Card class="p-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search users by name or email..."
        class="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={searchTerm}
      />
    </div>
  </Card>

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <div class="text-center text-destructive">
        <AlertCircle class="mx-auto mb-2 h-8 w-8" />
        <p>{error}</p>
        <div class="mt-4">
          <Button variant="outline" on:click={loadUsers}>Retry</Button>
        </div>
      </div>
    </Card>
  {:else if filteredUsers.length === 0}
    <Card class="p-12">
      <div class="text-center">
        <p class="text-muted-foreground">
          {searchTerm ? 'No users match your search' : 'No users found'}
        </p>
        {#if !searchTerm}
          <div class="mt-4">
            <Button on:click={() => (showCreateModal = true)}>
              <Plus class="h-4 w-4" />
              Add First User
            </Button>
          </div>
        {/if}
      </div>
    </Card>
  {:else}
    <!-- User Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each filteredUsers as user}
        <button type="button" class="text-left w-full" on:click={() => openEditModal(user)}>
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
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                <Badge variant={getStatusBadgeVariant(user.status)}>
                  {user.status || 'ACTIVE'}
                </Badge>
              </div>
            </div>
            <div class="mt-4 border-t pt-4 text-sm text-muted-foreground">
              <div class="flex items-center justify-center gap-2">
                <Mail class="h-4 w-4" />
                <span class="truncate">{user.email}</span>
              </div>
            </div>
          </div>
        </Card>
        </button>
      {/each}
    </div>

    <!-- Summary -->
    <div class="text-center text-sm text-muted-foreground">
      Showing {filteredUsers.length} of {users.length} users
    </div>
  {/if}
</div>

<!-- Create User Modal -->
<AdminUserForm
  bind:open={showCreateModal}
  on:success={handleUserCreated}
/>

<!-- Edit User Modal -->
<AdminUserForm
  bind:open={showEditModal}
  user={selectedUser}
  on:success={handleUserUpdated}
/>
