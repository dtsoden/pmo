<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { api, type ProjectDetail, type Task } from '$lib/api/client';
  import { ws } from '$lib/stores/websocket';
  import { Card, Button, Badge, Avatar, Spinner, EmptyState, Modal } from '$components/shared';
  import {
    cn,
    formatDate,
    formatCurrency,
    fullName,
    getProjectStatusVariant,
    getTaskStatusVariant,
    getPriorityVariant,
    PROJECT_STATUS_LABELS,
    TASK_STATUS_LABELS,
    PRIORITY_LABELS,
  } from '$lib/utils';
  import {
    ArrowLeft,
    Edit,
    Trash2,
    Plus,
    Users,
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock,
    UsersRound,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import ProjectForm from '../ProjectForm.svelte';
  import TaskForm from './TaskForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  const projectId = $page?.params?.id ?? '';

  let project: ProjectDetail | null = null;
  let tasks: Task[] = [];
  let loading = true;
  let error = '';

  let showEditModal = false;
  let showDeleteModal = false;
  let showTaskModal = false;
  let deleting = false;

  async function loadProject() {
    loading = true;
    error = '';

    try {
      const [projectData, tasksData] = await Promise.all([
        api.projects.get(projectId),
        api.projects.tasks.list(projectId),
      ]);

      project = projectData;
      tasks = tasksData || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load project';
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    deleting = true;

    try {
      await api.projects.delete(projectId);
      toast.success('Project deleted successfully');
      if (browser) {
        window.location.href = '/projects';
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete project');
    } finally {
      deleting = false;
      showDeleteModal = false;
    }
  }

  function handleProjectUpdated() {
    showEditModal = false;
    loadProject();
  }

  function handleTaskCreated() {
    showTaskModal = false;
    loadProject();
  }

  onMount(() => {
    loadProject();

    // Join project room for real-time updates
    ws.joinProject(projectId);

    const unsubscribe = ws.on('project:updated', (data: unknown) => {
      const event = data as { projectId: string };
      if (event.projectId === projectId) {
        loadProject();
      }
    });

    return () => {
      unsubscribe();
      ws.leaveProject(projectId);
    };
  });

  $: completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  $: progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
</script>

<svelte:head>
  <title>{project?.name || 'Project'} - PMO</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if error}
  <Card class="p-6">
    <p class="text-center text-destructive">{error}</p>
    <div class="mt-4 text-center">
      <Button variant="outline" on:click={loadProject}>Retry</Button>
    </div>
  </Card>
{:else if project}
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <a
          href="/projects"
          class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to Projects
        </a>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">{project.name}</h1>
          <span class="text-muted-foreground">({project.code})</span>
        </div>
        {#if project.description}
          <p class="mt-1 text-muted-foreground">{project.description}</p>
        {/if}
        <div class="mt-2 flex items-center gap-3">
          <Badge variant={getPriorityVariant(project.priority)}>
            {PRIORITY_LABELS[project.priority]}
          </Badge>
          <Badge variant={getProjectStatusVariant(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
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

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Users class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Resources</p>
            <p class="text-xl font-semibold">
              {project.assignments.length + (project.teamAssignments?.length || 0)}
            </p>
            <p class="text-xs text-muted-foreground">
              {project.teamAssignments?.length || 0} teams, {project.assignments.length} individuals
            </p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <CheckCircle2 class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Progress</p>
            <p class="text-xl font-semibold">{progress}%</p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <Calendar class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Timeline</p>
            <p class="text-sm font-medium">
              {formatDate(project.startDate)} - {formatDate(project.endDate)}
            </p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
            <DollarSign class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Budget</p>
            <p class="text-xl font-semibold">{formatCurrency(project.budget)}</p>
          </div>
        </div>
      </Card>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Tasks -->
      <div class="lg:col-span-2">
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Tasks ({tasks.length})</h2>
            <Button size="sm" on:click={() => (showTaskModal = true)}>
              <Plus class="h-4 w-4" />
              Add Task
            </Button>
          </div>
          <div class="divide-y">
            {#if tasks.length === 0}
              <EmptyState
                title="No tasks"
                description="Add tasks to track work on this project"
                class="py-8"
              >
                <svelte:fragment slot="action">
                  <Button size="sm" on:click={() => (showTaskModal = true)}>
                    <Plus class="h-4 w-4" />
                    Add Task
                  </Button>
                </svelte:fragment>
              </EmptyState>
            {:else}
              {#each tasks as task}
                <div class="flex items-center justify-between px-6 py-4">
                  <div class="flex-1">
                    <p class="font-medium">{task.title}</p>
                    <div class="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      {#if task.dueDate}
                        <span class="flex items-center gap-1">
                          <Clock class="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      {/if}
                      {#if task.estimatedHours}
                        <span>{task.estimatedHours}h estimated</span>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge variant={getTaskStatusVariant(task.status)}>
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Assigned Teams -->
        {#if project.teamAssignments && project.teamAssignments.length > 0}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Assigned Teams</h2>
            </div>
            <div class="p-4">
              <div class="space-y-3">
                {#each project.teamAssignments as teamAssignment}
                  <a
                    href="/teams/{teamAssignment.team.id}"
                    class="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                  >
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UsersRound class="h-4 w-4" />
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium">{teamAssignment.team.name}</p>
                      <p class="text-xs text-muted-foreground">
                        {teamAssignment.team._count?.members || 0} members
                      </p>
                    </div>
                    <span class="text-sm text-muted-foreground">{teamAssignment.allocatedHours}h/wk</span>
                  </a>
                {/each}
              </div>
            </div>
          </Card>
        {/if}

        <!-- Individual Assignments -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Individual Assignments</h2>
          </div>
          <div class="p-4">
            {#if project.assignments.length === 0}
              <p class="text-center text-sm text-muted-foreground">No individuals directly assigned</p>
            {:else}
              <div class="space-y-3">
                {#each project.assignments as assignment}
                  <a
                    href="/people/{assignment.user.id}"
                    class="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar
                      firstName={assignment.user.firstName}
                      lastName={assignment.user.lastName}
                      src={assignment.user.avatarUrl}
                      size="sm"
                    />
                    <div class="flex-1">
                      <p class="text-sm font-medium">
                        {fullName(assignment.user.firstName, assignment.user.lastName)}
                      </p>
                      <p class="text-xs text-muted-foreground">{assignment.role}</p>
                    </div>
                    <span class="text-sm text-muted-foreground">{assignment.allocatedHours}h/wk</span>
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        </Card>

        <!-- Milestones -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Milestones</h2>
          </div>
          <div class="p-4">
            {#if project.milestones.length === 0}
              <p class="text-center text-sm text-muted-foreground">No milestones defined</p>
            {:else}
              <div class="space-y-3">
                {#each project.milestones as milestone}
                  <div class="flex items-start gap-3">
                    <div
                      class={cn(
                        'mt-1 h-3 w-3 rounded-full',
                        milestone.isCompleted ? 'bg-green-500' : 'bg-muted'
                      )}
                    />
                    <div>
                      <p class="text-sm font-medium">{milestone.name}</p>
                      <p class="text-xs text-muted-foreground">{formatDate(milestone.dueDate)}</p>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Card>

        <!-- Details -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Details</h2>
          </div>
          <div class="space-y-3 p-4 text-sm">
            {#if project.client}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Client</span>
                <span class="font-medium">{project.client.name}</span>
              </div>
            {/if}
            {#if project.manager}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Project Manager</span>
                <span class="font-medium">
                  {fullName(project.manager.firstName, project.manager.lastName)}
                </span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Created</span>
              <span>{formatDate(project.createdAt)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Last Updated</span>
              <span>{formatDate(project.updatedAt)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <ProjectForm
    bind:open={showEditModal}
    {project}
    on:success={handleProjectUpdated}
  />

  <!-- Task Modal -->
  <TaskForm
    bind:open={showTaskModal}
    {projectId}
    phases={project.phases}
    milestones={project.milestones}
    on:success={handleTaskCreated}
  />

  <!-- Delete Confirmation Modal -->
  <Modal bind:open={showDeleteModal} title="Delete Project" size="sm">
    <p class="text-muted-foreground">
      Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone
      and will remove all associated tasks, assignments, and time entries.
    </p>
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => (showDeleteModal = false)}>
          Cancel
        </Button>
        <Button variant="destructive" loading={deleting} on:click={handleDelete}>
          Delete Project
        </Button>
      </div>
    </svelte:fragment>
  </Modal>
{/if}
