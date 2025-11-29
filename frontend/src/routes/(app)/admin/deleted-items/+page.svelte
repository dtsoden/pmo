<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Card, Button, Badge, Spinner, EmptyState } from '$components/shared';
  import { formatDate } from '$lib/utils';
  import { Trash2, RotateCcw, FolderOpen } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let deletedUsers: any[] = [];
  let deletedClients: any[] = [];
  let deletedProjects: any[] = [];
  let deletedTasks: any[] = [];
  let loading = true;
  let error = '';
  let activeTab: 'people' | 'clients' | 'projects' | 'tasks' = 'people';

  onMount(async () => {
    // Check admin access
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }

    await loadDeletedItems();
  });

  async function loadDeletedItems() {
    loading = true;
    error = '';

    try {
      // Load deleted users, clients, projects, and tasks
      const [usersRes, clientsRes, projectsRes, tasksRes] = await Promise.all([
        api.admin.deletedUsers().catch(() => ({ data: [] })),
        api.admin.deletedClients().catch(() => ({ data: [] })),
        api.admin.deletedProjects().catch(() => ({ data: [] })),
        api.admin.deletedTasks().catch(() => ({ data: [] })),
      ]);

      deletedUsers = usersRes.data || [];
      deletedClients = clientsRes.data || [];
      deletedProjects = projectsRes.data || [];
      deletedTasks = tasksRes.data || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load deleted items';
    } finally {
      loading = false;
    }
  }

  async function restoreProject(projectId: string, projectName: string) {
    if (!confirm(`Restore project "${projectName}"?`)) {
      return;
    }

    try {
      await api.admin.restoreProject(projectId);
      toast.success('Project restored successfully');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to restore project');
    }
  }

  async function restoreTask(taskId: string, taskTitle: string) {
    if (!confirm(`Restore task "${taskTitle}"?`)) {
      return;
    }

    try {
      await api.admin.restoreTask(taskId);
      toast.success('Task restored successfully');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to restore task');
    }
  }

  async function permanentlyDeleteProject(projectId: string, projectName: string) {
    if (!confirm(`Permanently delete project "${projectName}" and all its phases, milestones, tasks, and assignments? This action cannot be undone!`)) {
      return;
    }

    try {
      await api.admin.permanentlyDeleteProject(projectId);
      toast.success('Project and associated data permanently deleted');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete project');
    }
  }

  async function permanentlyDeleteTask(taskId: string, taskTitle: string) {
    if (!confirm(`Permanently delete task "${taskTitle}"? This action cannot be undone!`)) {
      return;
    }

    try {
      await api.admin.permanentlyDeleteTask(taskId);
      toast.success('Task permanently deleted');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete task');
    }
  }

  async function restoreUser(userId: string, userName: string) {
    if (!confirm(`Restore user "${userName}"?`)) {
      return;
    }

    try {
      await api.admin.restoreUser(userId);
      toast.success('User restored successfully');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to restore user');
    }
  }

  async function permanentlyDeleteUser(userId: string, userName: string) {
    if (!confirm(`Permanently delete user "${userName}"? This action cannot be undone!`)) {
      return;
    }

    try {
      await api.admin.permanentlyDeleteUser(userId);
      toast.success('User permanently deleted');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete user');
    }
  }

  async function restoreClient(clientId: string, clientName: string) {
    if (!confirm(`Restore client "${clientName}"?`)) {
      return;
    }

    try {
      await api.admin.restoreClient(clientId);
      toast.success('Client restored successfully');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to restore client');
    }
  }

  async function permanentlyDeleteClient(clientId: string, clientName: string) {
    if (!confirm(`Permanently delete client "${clientName}" and all its soft-deleted projects? This action cannot be undone!`)) {
      return;
    }

    try {
      await api.admin.permanentlyDeleteClient(clientId);
      toast.success('Client and associated data permanently deleted');
      await loadDeletedItems();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete client');
    }
  }
</script>

<svelte:head>
  <title>Deleted Items - Admin - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold">Deleted Items Recovery</h1>
    <p class="text-muted-foreground">Restore or permanently delete soft-deleted items</p>
  </div>

  <!-- Tabs -->
  <div class="flex gap-2 border-b">
    <button
      class="px-4 py-2 font-medium transition-colors {activeTab === 'people'
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground'}"
      on:click={() => (activeTab = 'people')}
    >
      Deleted People ({deletedUsers.length})
    </button>
    <button
      class="px-4 py-2 font-medium transition-colors {activeTab === 'clients'
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground'}"
      on:click={() => (activeTab = 'clients')}
    >
      Deleted Clients ({deletedClients.length})
    </button>
    <button
      class="px-4 py-2 font-medium transition-colors {activeTab === 'projects'
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground'}"
      on:click={() => (activeTab = 'projects')}
    >
      Deleted Projects ({deletedProjects.length})
    </button>
    <button
      class="px-4 py-2 font-medium transition-colors {activeTab === 'tasks'
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground'}"
      on:click={() => (activeTab = 'tasks')}
    >
      Deleted Tasks ({deletedTasks.length})
    </button>
  </div>

  <!-- Content -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadDeletedItems}>Retry</Button>
      </div>
    </Card>
  {:else if activeTab === 'people'}
    {#if deletedUsers.length === 0}
      <Card>
        <EmptyState
          title="No deleted people"
          description="All users are active or have been permanently deleted"
        >
          <svelte:fragment slot="icon">
            <FolderOpen class="h-12 w-12" />
          </svelte:fragment>
        </EmptyState>
      </Card>
    {:else}
      <div class="grid gap-4">
        {#each deletedUsers as user}
          <Card class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold">{user.firstName} {user.lastName}</h3>
                <p class="text-sm text-muted-foreground">{user.email}</p>
                <div class="mt-3 flex gap-4 text-sm text-muted-foreground">
                  {#if user.department}
                    <span>Dept: {user.department}</span>
                  {/if}
                  {#if user.jobTitle}
                    <span>{user.jobTitle}</span>
                  {/if}
                  {#if user.deletedAt}
                    <span>Deleted: {formatDate(user.deletedAt)}</span>
                  {/if}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => restoreUser(user.id, `${user.firstName} ${user.lastName}`)}
                >
                  <RotateCcw class="h-4 w-4" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  on:click={() => permanentlyDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                >
                  <Trash2 class="h-4 w-4" />
                  Delete Forever
                </Button>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  {:else if activeTab === 'clients'}
    {#if deletedClients.length === 0}
      <Card>
        <EmptyState
          title="No deleted clients"
          description="All clients are active or have been permanently deleted"
        >
          <svelte:fragment slot="icon">
            <FolderOpen class="h-12 w-12" />
          </svelte:fragment>
        </EmptyState>
      </Card>
    {:else}
      <div class="grid gap-4">
        {#each deletedClients as client}
          <Card class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold">{client.name}</h3>
                {#if client.industry}
                  <p class="text-sm text-muted-foreground">{client.industry}</p>
                {/if}
                <div class="mt-3 flex gap-4 text-sm text-muted-foreground">
                  {#if client.status}
                    <span>Status: {client.status}</span>
                  {/if}
                  {#if client.country}
                    <span>Country: {client.country}</span>
                  {/if}
                  {#if client.deletedAt}
                    <span>Deleted: {formatDate(client.deletedAt)}</span>
                  {/if}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => restoreClient(client.id, client.name)}
                >
                  <RotateCcw class="h-4 w-4" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  on:click={() => permanentlyDeleteClient(client.id, client.name)}
                >
                  <Trash2 class="h-4 w-4" />
                  Delete Forever
                </Button>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  {:else if activeTab === 'projects'}
    {#if deletedProjects.length === 0}
      <Card>
        <EmptyState
          title="No deleted projects"
          description="All projects are active or have been permanently deleted"
        >
          <svelte:fragment slot="icon">
            <FolderOpen class="h-12 w-12" />
          </svelte:fragment>
        </EmptyState>
      </Card>
    {:else}
      <div class="grid gap-4">
        {#each deletedProjects as project}
          <Card class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold">{project.name}</h3>
                <p class="text-sm text-muted-foreground">{project.code}</p>
                {#if project.description}
                  <p class="mt-2 text-sm text-muted-foreground">{project.description}</p>
                {/if}
                <div class="mt-3 flex gap-4 text-sm text-muted-foreground">
                  {#if project.client}
                    <span>Client: {project.client.name}</span>
                  {/if}
                  {#if project.deletedAt}
                    <span>Deleted: {formatDate(project.deletedAt)}</span>
                  {/if}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => restoreProject(project.id, project.name)}
                >
                  <RotateCcw class="h-4 w-4" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  on:click={() => permanentlyDeleteProject(project.id, project.name)}
                >
                  <Trash2 class="h-4 w-4" />
                  Delete Forever
                </Button>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  {:else if activeTab === 'tasks'}
    {#if deletedTasks.length === 0}
      <Card>
        <EmptyState
          title="No deleted tasks"
          description="All tasks are active or have been permanently deleted"
        >
          <svelte:fragment slot="icon">
            <FolderOpen class="h-12 w-12" />
          </svelte:fragment>
        </EmptyState>
      </Card>
    {:else}
      <div class="grid gap-4">
        {#each deletedTasks as task}
          <Card class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold">{task.title}</h3>
                {#if task.description}
                  <p class="mt-1 text-sm text-muted-foreground">{task.description}</p>
                {/if}
                <div class="mt-3 flex gap-4 text-sm text-muted-foreground">
                  {#if task.project}
                    <span>Project: {task.project.name}</span>
                  {/if}
                  {#if task.deletedAt}
                    <span>Deleted: {formatDate(task.deletedAt)}</span>
                  {/if}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => restoreTask(task.id, task.title)}
                >
                  <RotateCcw class="h-4 w-4" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  on:click={() => permanentlyDeleteTask(task.id, task.title)}
                >
                  <Trash2 class="h-4 w-4" />
                  Delete Forever
                </Button>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  {/if}
</div>
