<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { api, type User, type ResourceAllocation } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Card, Button, Badge, Avatar, Spinner, Modal, Input } from '$components/shared';
  import { cn, fullName, formatDate, ROLE_LABELS } from '$lib/utils';
  import {
    ArrowLeft,
    Edit,
    Trash2,
    Mail,
    Phone,
    Building2,
    Calendar,
    FolderKanban,
    Clock,
    MapPin,
    Briefcase,
    DollarSign,
    Wrench,
    Key,
    LogOut,
    Shield,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import AdminUserForm from '../AdminUserForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let user: User | null = null;
  let allocations: ResourceAllocation[] = [];
  let loading = true;
  let error = '';

  let showEditModal = false;
  let showDeleteModal = false;
  let showPasswordResetModal = false;
  let showTerminateSessionsModal = false;
  let deleting = false;
  let actionLoading = false;
  let newPassword = '';

  // Get userId reactively from the page store
  $: userId = $page?.params?.id || '';

  onMount(async () => {
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }
  });

  // Load user when userId becomes available
  $: if (userId) {
    loadUser(userId);
  }

  async function loadUser(id: string) {
    loading = true;
    error = '';

    try {
      const [userData, allocationsData] = await Promise.all([
        api.users.get(id),
        api.resources.getByUser(id).catch(() => null),
      ]);

      user = userData;
      allocations = allocationsData?.assignments || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load user';
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    deleting = true;

    try {
      await api.users.delete(userId);
      toast.success('User deleted successfully');
      if (browser) {
        window.location.href = '/admin/users';
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete user');
    } finally {
      deleting = false;
      showDeleteModal = false;
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    actionLoading = true;
    try {
      await api.admin.users.resetPassword(userId, newPassword);
      toast.success('Password reset successfully');
      showPasswordResetModal = false;
      newPassword = '';
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reset password');
    } finally {
      actionLoading = false;
    }
  }

  async function handleTerminateSessions() {
    actionLoading = true;
    try {
      const result = await api.admin.sessions.terminateAllUserSessions(userId);
      toast.success(`Terminated ${result.terminatedCount} session(s)`);
      showTerminateSessionsModal = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to terminate sessions');
    } finally {
      actionLoading = false;
    }
  }

  function handleUserUpdated() {
    showEditModal = false;
    loadUser();
  }

  function getRoleBadgeVariant(role: string) {
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

  $: totalAllocation = (allocations || []).reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
  $: maxHours = user?.maxWeeklyHours || user?.defaultWeeklyHours || 40;
  $: utilizationPercent = maxHours > 0 ? Math.round((totalAllocation / maxHours) * 100) : 0;
</script>

<svelte:head>
  <title>{user ? fullName(user.firstName, user.lastName) : 'User'} - Admin - PMO Platform</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if error}
  <Card class="p-6">
    <p class="text-center text-destructive">{error}</p>
    <div class="mt-4 text-center">
      <Button variant="outline" on:click={loadUser}>Retry</Button>
    </div>
  </Card>
{:else if user}
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <a
          href="/admin/users"
          class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to User Management
        </a>
        <div class="flex items-center gap-4">
          <Avatar
            firstName={user.firstName}
            lastName={user.lastName}
            src={user.avatarUrl}
            size="lg"
          />
          <div>
            <h1 class="text-2xl font-bold">{fullName(user.firstName, user.lastName)}</h1>
            {#if user.jobTitle}
              <p class="text-muted-foreground">{user.jobTitle}</p>
            {/if}
            <div class="mt-2 flex items-center gap-2">
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <Badge variant={getStatusBadgeVariant(user.status)}>
                {user.status || 'ACTIVE'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
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
        <!-- Admin Actions Card -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center gap-2">
              <Shield class="h-5 w-5 text-amber-500" />
              <h2 class="font-semibold">Administrative Actions</h2>
            </div>
          </div>
          <div class="p-6">
            <div class="flex flex-wrap gap-3">
              <Button variant="outline" on:click={() => (showPasswordResetModal = true)}>
                <Key class="h-4 w-4" />
                Reset Password
              </Button>
              <Button variant="outline" on:click={() => (showTerminateSessionsModal = true)}>
                <LogOut class="h-4 w-4" />
                Terminate All Sessions
              </Button>
            </div>
            <p class="mt-4 text-sm text-muted-foreground">
              These actions will immediately affect the user's account. Use with caution.
            </p>
          </div>
        </Card>

        <!-- Project Assignments -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Project Assignments</h2>
              <span class="text-sm text-muted-foreground">
                Total: {totalAllocation}h/week
              </span>
            </div>
          </div>
          {#if !allocations || allocations.length === 0}
            <div class="p-6 text-center text-muted-foreground">
              Not assigned to any projects
            </div>
          {:else}
            <div class="divide-y">
              {#each allocations as assignment}
                <div class="flex items-center justify-between px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban class="h-5 w-5" />
                    </div>
                    <div>
                      <a
                        href="/projects/{assignment.project?.id || assignment.projectId}"
                        class="font-medium hover:text-primary"
                      >
                        {assignment.project?.name || 'Unknown Project'}
                      </a>
                      <p class="text-sm text-muted-foreground">{assignment.role}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold">{assignment.allocatedHours}h/wk</p>
                    <p class="text-sm text-muted-foreground">{assignment.status}</p>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <!-- Allocation Chart -->
        <Card class="p-6">
          <h2 class="mb-4 font-semibold">Allocation Overview</h2>
          <div class="h-4 overflow-hidden rounded-full bg-muted">
            <div
              class={cn(
                'h-full transition-all',
                utilizationPercent > 100 ? 'bg-red-500' : utilizationPercent > 80 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style="width: {Math.min(utilizationPercent, 100)}%"
            />
          </div>
          <div class="mt-2 flex justify-between text-sm">
            <span class="text-muted-foreground">0h</span>
            <span class={cn(
              utilizationPercent > 100 ? 'text-red-500 font-medium' : 'text-muted-foreground'
            )}>
              {totalAllocation}h / {maxHours}h ({utilizationPercent}%)
            </span>
            <span class="text-muted-foreground">{maxHours}h</span>
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Capacity Card -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Capacity</h2>
          </div>
          <div class="space-y-4 p-4">
            <div class="flex items-center gap-3">
              <Clock class="h-5 w-5 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium">{user.defaultWeeklyHours || 40}h / week</p>
                <p class="text-xs text-muted-foreground">Default Hours</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Clock class="h-5 w-5 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium">{user.maxWeeklyHours || 40}h / week</p>
                <p class="text-xs text-muted-foreground">Maximum Hours</p>
              </div>
            </div>
            {#if user.employmentType}
              <div class="flex items-center gap-3">
                <Briefcase class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">{user.employmentType.replace('_', ' ')}</span>
              </div>
            {/if}
          </div>
        </Card>

        <!-- Contact Info -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Contact Information</h2>
          </div>
          <div class="space-y-4 p-4">
            <div class="flex items-center gap-3">
              <Mail class="h-5 w-5 text-muted-foreground" />
              <a href="mailto:{user.email}" class="text-sm text-primary hover:underline">
                {user.email}
              </a>
            </div>
            {#if user.phone}
              <div class="flex items-center gap-3">
                <Phone class="h-5 w-5 text-muted-foreground" />
                <a href="tel:{user.phone}" class="text-sm hover:text-primary">
                  {user.phone}
                </a>
              </div>
            {/if}
            {#if user.department}
              <div class="flex items-center gap-3">
                <Building2 class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">{user.department}</span>
              </div>
            {/if}
            {#if user.country || user.region}
              <div class="flex items-center gap-3">
                <MapPin class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">
                  {[user.region, user.country].filter(Boolean).join(', ')}
                </span>
              </div>
            {/if}
            {#if user.timezone}
              <div class="flex items-center gap-3">
                <Calendar class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">{user.timezone}</span>
              </div>
            {/if}
          </div>
        </Card>

        <!-- Skills -->
        {#if user.skills && user.skills.length > 0}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Skills</h2>
            </div>
            <div class="p-4">
              <div class="flex flex-wrap gap-2">
                {#each user.skills as skill}
                  <Badge variant="secondary">
                    <Wrench class="mr-1 h-3 w-3" />
                    {skill}
                  </Badge>
                {/each}
              </div>
            </div>
          </Card>
        {/if}

        <!-- Billing Rates -->
        {#if user.hourlyRate || user.billableRate}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Billing Rates</h2>
            </div>
            <div class="space-y-3 p-4">
              {#if user.hourlyRate}
                <div class="flex items-center gap-3">
                  <DollarSign class="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p class="text-sm font-medium">${user.hourlyRate.toFixed(2)}/hr</p>
                    <p class="text-xs text-muted-foreground">Hourly Rate</p>
                  </div>
                </div>
              {/if}
              {#if user.billableRate}
                <div class="flex items-center gap-3">
                  <DollarSign class="h-5 w-5 text-green-500" />
                  <div>
                    <p class="text-sm font-medium">${user.billableRate.toFixed(2)}/hr</p>
                    <p class="text-xs text-muted-foreground">Billable Rate</p>
                  </div>
                </div>
              {/if}
            </div>
          </Card>
        {/if}

        <!-- Manager -->
        {#if user.manager}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Reports To</h2>
            </div>
            <div class="p-4">
              <a href="/admin/users/{user.managerId}" class="flex items-center gap-3 hover:text-primary">
                <Avatar
                  firstName={user.manager.firstName}
                  lastName={user.manager.lastName}
                  size="sm"
                />
                <span class="text-sm font-medium">
                  {fullName(user.manager.firstName, user.manager.lastName)}
                </span>
              </a>
            </div>
          </Card>
        {/if}

        <!-- Metadata -->
        <Card>
          <div class="space-y-2 p-4 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Created</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Last Updated</span>
              <span>{formatDate(user.updatedAt)}</span>
            </div>
            {#if user.lastLoginAt}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Last Login</span>
                <span>{formatDate(user.lastLoginAt)}</span>
              </div>
            {/if}
          </div>
        </Card>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <AdminUserForm
    bind:open={showEditModal}
    {user}
    on:success={handleUserUpdated}
  />

  <!-- Delete Confirmation Modal -->
  <Modal bind:open={showDeleteModal} title="Delete User" size="sm">
    <p class="text-muted-foreground">
      Are you sure you want to delete <strong>{fullName(user.firstName, user.lastName)}</strong>?
      This will deactivate their account.
    </p>
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => (showDeleteModal = false)}>
          Cancel
        </Button>
        <Button variant="destructive" loading={deleting} on:click={handleDelete}>
          Delete User
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Password Reset Modal -->
  <Modal bind:open={showPasswordResetModal} title="Reset Password" size="sm">
    <p class="mb-4 text-muted-foreground">
      Set a new password for <strong>{user.email}</strong>
    </p>
    <Input
      type="password"
      label="New Password"
      placeholder="Minimum 8 characters"
      bind:value={newPassword}
    />
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => { showPasswordResetModal = false; newPassword = ''; }}>
          Cancel
        </Button>
        <Button loading={actionLoading} disabled={newPassword.length < 8} on:click={handleResetPassword}>
          Reset Password
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Terminate Sessions Modal -->
  <Modal bind:open={showTerminateSessionsModal} title="Terminate All Sessions" size="sm">
    <p class="text-muted-foreground">
      This will log <strong>{fullName(user.firstName, user.lastName)}</strong> out of all devices immediately.
      They will need to log in again.
    </p>
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => (showTerminateSessionsModal = false)}>
          Cancel
        </Button>
        <Button variant="destructive" loading={actionLoading} on:click={handleTerminateSessions}>
          Terminate Sessions
        </Button>
      </div>
    </svelte:fragment>
  </Modal>
{/if}
