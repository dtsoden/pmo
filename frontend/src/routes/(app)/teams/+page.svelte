<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Team } from '$lib/api/client';
  import { Card, Button, Badge, Spinner, EmptyState } from '$components/shared';
  import { Plus, Search, Users, FolderKanban, Wrench } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import TeamForm from './TeamForm.svelte';

  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let teams: Team[] = [];
  let loading = true;
  let error = '';
  let search = '';
  let showCreateModal = false;
  let editingTeam: Team | null = null;

  // Pagination
  let page = 1;
  let limit = 20;
  let total = 0;
  let totalPages = 0;

  async function loadTeams() {
    loading = true;
    error = '';

    try {
      const response = await api.teams.list({
        page,
        limit,
        search: search || undefined,
        isActive: true,
      });

      teams = response.data || [];
      total = response.pagination?.total || 0;
      totalPages = response.pagination?.totalPages || 0;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load teams';
    } finally {
      loading = false;
    }
  }

  onMount(loadTeams);

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      page = 1;
      loadTeams();
    }
  }

  function handleTeamCreated() {
    showCreateModal = false;
    editingTeam = null;
    loadTeams();
    toast.success('Team saved successfully');
  }

  async function deleteTeam(team: Team) {
    if (!confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.teams.delete(team.id);
      toast.success('Team deleted');
      loadTeams();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete team');
    }
  }
</script>

<svelte:head>
  <title>Teams - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Teams</h1>
      <p class="text-muted-foreground">Manage teams and their assignments to projects</p>
    </div>
    <Button on:click={() => (showCreateModal = true)}>
      <Plus class="h-4 w-4" />
      Create Team
    </Button>
  </div>

  <!-- Search -->
  <Card class="p-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search teams..."
        class="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={search}
        on:keydown={handleSearchKeydown}
      />
    </div>
  </Card>

  <!-- Teams Grid -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadTeams}>Retry</Button>
      </div>
    </Card>
  {:else if teams.length === 0}
    <Card>
      <EmptyState
        title="No teams found"
        description={search ? 'Try a different search term' : 'Get started by creating your first team'}
      >
        <svelte:fragment slot="icon">
          <Users class="h-12 w-12" />
        </svelte:fragment>
        <svelte:fragment slot="action">
          {#if !search}
            <Button on:click={() => (showCreateModal = true)}>
              <Plus class="h-4 w-4" />
              Create Team
            </Button>
          {/if}
        </svelte:fragment>
      </EmptyState>
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each teams as team}
        <Card class="transition-shadow hover:shadow-md">
          <a href="/teams/{team.id}" class="block p-6">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users class="h-5 w-5" />
                </div>
                <div>
                  <h3 class="font-semibold">{team.name}</h3>
                  {#if team.description}
                    <p class="text-sm text-muted-foreground line-clamp-1">{team.description}</p>
                  {/if}
                </div>
              </div>
              {#if !team.isActive}
                <Badge variant="default">Inactive</Badge>
              {/if}
            </div>

            <!-- Stats -->
            <div class="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div class="flex items-center gap-1">
                <Users class="h-4 w-4" />
                <span>{team._count?.members || 0} members</span>
              </div>
              <div class="flex items-center gap-1">
                <FolderKanban class="h-4 w-4" />
                <span>{team._count?.projectAssignments || 0} projects</span>
              </div>
            </div>

            <!-- Skills -->
            {#if team.skills && team.skills.length > 0}
              <div class="mt-3 flex flex-wrap gap-1">
                {#each team.skills.slice(0, 3) as skill}
                  <Badge variant="default" class="text-xs">
                    <Wrench class="mr-1 h-3 w-3" />
                    {skill}
                  </Badge>
                {/each}
                {#if team.skills.length > 3}
                  <Badge variant="default" class="text-xs">+{team.skills.length - 3} more</Badge>
                {/if}
              </div>
            {/if}
          </a>

          <!-- Actions -->
          <div class="flex border-t px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              class="flex-1"
              on:click={(e) => {
                e.preventDefault();
                editingTeam = team;
                showCreateModal = true;
              }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="flex-1 text-destructive hover:text-destructive"
              on:click={(e) => {
                e.preventDefault();
                deleteTeam(team);
              }}
            >
              Delete
            </Button>
          </div>
        </Card>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} teams
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            on:click={() => {
              page--;
              loadTeams();
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
              loadTeams();
            }}
          >
            Next
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Team Form Modal -->
<TeamForm
  bind:open={showCreateModal}
  team={editingTeam}
  on:success={handleTeamCreated}
  on:close={() => {
    showCreateModal = false;
    editingTeam = null;
  }}
/>
