<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Project, type ProjectStatus, type ProjectPriority, type DropdownLists } from '$lib/api/client';
  import { Card, Button, Badge, Input, Select, Spinner, EmptyState } from '$components/shared';
  import {
    cn,
    formatDate,
    getProjectStatusVariant,
    getPriorityVariant,
    PROJECT_STATUS_LABELS,
    PRIORITY_LABELS,
    debounce,
  } from '$lib/utils';
  import { Plus, Search, FolderKanban, Calendar, User, Building2 } from 'lucide-svelte';
  import ProjectForm from './ProjectForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let projects: Project[] = [];
  let loading = true;
  let error = '';

  // Filters
  let search = '';
  let statusFilter = 'ACTIVE';
  let priorityFilter = '';
  let typeFilter = '';

  // Pagination
  let page = 1;
  let limit = 10;
  let total = 0;
  let totalPages = 0;

  // Modal
  let showCreateModal = false;

  // Dropdown lists for filters
  let dropdownLists: DropdownLists | null = null;

  async function loadProjects() {
    loading = true;
    error = '';

    try {
      const response = await api.projects.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter as ProjectStatus || undefined,
        priority: priorityFilter as ProjectPriority || undefined,
        type: typeFilter || undefined,
      });

      projects = response.data || [];
      total = response.total || 0;
      totalPages = response.totalPages || 0;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load projects';
    } finally {
      loading = false;
    }
  }

  async function loadDropdownLists() {
    try {
      dropdownLists = await api.admin.dropdowns.getAll();
    } catch {
      // Silently fail - dropdown lists will be empty
    }
  }

  const debouncedSearch = debounce(() => {
    page = 1;
    loadProjects();
  }, 300);

  onMount(() => {
    loadProjects();
    loadDropdownLists();
  });

  function handleSearchInput() {
    debouncedSearch();
  }

  function handleFilterChange() {
    page = 1;
    loadProjects();
  }

  function handleProjectCreated() {
    showCreateModal = false;
    loadProjects();
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
  ];

  $: typeOptions = [
    { value: '', label: 'All Types' },
    ...(dropdownLists?.projectTypes || []).map((t) => ({ value: t, label: t })),
  ];
</script>

<svelte:head>
  <title>Projects - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Projects</h1>
      <p class="text-muted-foreground">Manage and track all your projects</p>
    </div>
    <Button on:click={() => (showCreateModal = true)}>
      <Plus class="h-4 w-4" />
      New Project
    </Button>
  </div>

  <!-- Filters -->
  <Card class="p-4">
    <div class="flex flex-col gap-4 md:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          class="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={search}
          on:input={handleSearchInput}
        />
      </div>
      <div class="flex gap-4">
        <Select
          options={typeOptions}
          bind:value={typeFilter}
          on:change={handleFilterChange}
          class="w-40"
        />
        <Select
          options={statusOptions}
          bind:value={statusFilter}
          on:change={handleFilterChange}
          class="w-40"
        />
        <Select
          options={priorityOptions}
          bind:value={priorityFilter}
          on:change={handleFilterChange}
          class="w-40"
        />
      </div>
    </div>
  </Card>

  <!-- Projects List -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadProjects}>Retry</Button>
      </div>
    </Card>
  {:else if projects.length === 0}
    <Card>
      <EmptyState
        title="No projects found"
        description={search || statusFilter || priorityFilter || typeFilter
          ? 'Try adjusting your filters'
          : 'Get started by creating your first project'}
      >
        <svelte:fragment slot="icon">
          <FolderKanban class="h-12 w-12" />
        </svelte:fragment>
        <svelte:fragment slot="action">
          {#if !search && !statusFilter && !priorityFilter && !typeFilter}
            <Button on:click={() => (showCreateModal = true)}>
              <Plus class="h-4 w-4" />
              New Project
            </Button>
          {/if}
        </svelte:fragment>
      </EmptyState>
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each projects as project}
        <Card class="transition-shadow hover:shadow-md">
          <a href="/projects/{project.id}" class="block p-6">
            <div class="flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderKanban class="h-6 w-6" />
              </div>
              <div class="flex gap-2">
                <Badge variant={getPriorityVariant(project.priority)}>
                  {PRIORITY_LABELS[project.priority]}
                </Badge>
                <Badge variant={getProjectStatusVariant(project.status)}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </div>
            </div>
            <h3 class="mt-4 text-lg font-semibold">{project.name}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{project.code}</p>
            {#if project.description}
              <p class="mt-2 text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            {/if}
            <div class="mt-4 space-y-2 text-sm text-muted-foreground">
              {#if project.client}
                <div class="flex items-center gap-2">
                  <Building2 class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{project.client.name}</span>
                </div>
              {/if}
              {#if project.manager}
                <div class="flex items-center gap-2">
                  <User class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">PM: {project.manager.firstName} {project.manager.lastName}</span>
                </div>
              {/if}
              {#if project.startDate || project.endDate}
                <div class="flex items-center gap-2">
                  <Calendar class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">
                    {formatDate(project.startDate)} - {formatDate(project.endDate)}
                  </span>
                </div>
              {/if}
            </div>
            {#if project._count}
              <div class="mt-4 flex gap-4 border-t pt-4 text-sm text-muted-foreground">
                <span>{project._count.phases || 0} phases</span>
                <span>{project._count.tasks || 0} tasks</span>
                <span>{project._count.assignments || 0} members</span>
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
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} projects
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            on:click={() => {
              page--;
              loadProjects();
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
              loadProjects();
            }}
          >
            Next
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Create Project Modal -->
<ProjectForm
  bind:open={showCreateModal}
  on:success={handleProjectCreated}
/>
