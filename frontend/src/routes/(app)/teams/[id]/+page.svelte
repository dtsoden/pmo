<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api, type TeamDetail, type TeamMember, type TeamCapacity, type User, type TeamMemberRole } from '$lib/api/client';
  import { Card, Button, Badge, Avatar, Spinner, EmptyState, Modal, Select } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import {
    ArrowLeft,
    Users,
    FolderKanban,
    Wrench,
    Plus,
    Trash2,
    UserPlus,
    Clock,
    AlertTriangle,
    ChevronRight,
    X,
  } from 'lucide-svelte';
  import TeamForm from '../TeamForm.svelte';

  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let team: TeamDetail | null = null;
  let capacity: TeamCapacity | null = null;
  let loading = true;
  let error = '';
  let showEditModal = false;
  let showAddMemberModal = false;

  // Add member form
  let availableUsers: User[] = [];
  let selectedUserId = '';
  let selectedUser: User | null = null;
  let selectedRole: TeamMemberRole = 'MEMBER';
  let addingMember = false;
  let userSearch = '';

  $: filteredUsers = availableUsers.filter((u) => {
    if (!userSearch.trim()) return true;
    const search = userSearch.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(search) ||
      u.lastName.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(search))
    );
  });

  $: teamId = $page.params.id;

  async function loadTeam() {
    if (!teamId) return;

    loading = true;
    error = '';

    try {
      const [teamData, capacityData] = await Promise.all([
        api.teams.get(teamId),
        api.teams.capacity(teamId),
      ]);
      team = teamData;
      capacity = capacityData;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load team';
    } finally {
      loading = false;
    }
  }

  async function loadAvailableUsers() {
    try {
      const response = await api.users.list({ limit: 100 });
      // Filter out users already in the team
      const memberIds = team?.members.map((m) => m.user.id) || [];
      availableUsers = (response.data || []).filter((u) => !memberIds.includes(u.id));
    } catch (err) {
      toast.error('Failed to load users');
    }
  }

  onMount(loadTeam);

  function handleTeamUpdated() {
    showEditModal = false;
    loadTeam();
    toast.success('Team updated');
  }

  async function openAddMemberModal() {
    userSearch = '';
    selectedUserId = '';
    selectedUser = null;
    selectedRole = 'MEMBER';
    showAddMemberModal = true;
    await loadAvailableUsers();
  }

  async function addMember() {
    if (!selectedUserId || !teamId) return;

    addingMember = true;
    try {
      await api.teams.members.add(teamId, selectedUserId, selectedRole);
      toast.success('Member added');
      showAddMemberModal = false;
      selectedUserId = '';
      selectedUser = null;
      selectedRole = 'MEMBER';
      userSearch = '';
      loadTeam();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to add member');
    } finally {
      addingMember = false;
    }
  }

  function selectUser(user: User) {
    selectedUserId = user.id;
    selectedUser = user;
  }

  async function removeMember(member: TeamMember) {
    if (!teamId) return;
    if (!confirm(`Remove ${member.user.firstName} ${member.user.lastName} from this team?`)) {
      return;
    }

    try {
      await api.teams.members.remove(teamId, member.user.id);
      toast.success('Member removed');
      loadTeam();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove member');
    }
  }

  async function updateMemberRole(member: TeamMember, newRole: TeamMemberRole) {
    if (!teamId) return;

    try {
      await api.teams.members.updateRole(teamId, member.user.id, newRole);
      toast.success('Role updated');
      loadTeam();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update role');
    }
  }

  function handleRoleChange(member: TeamMember, event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    updateMemberRole(member, target.value as TeamMemberRole);
  }

  function getRoleBadgeColor(role: TeamMemberRole): string {
    switch (role) {
      case 'LEAD':
        return 'bg-purple-500 text-white';
      case 'SENIOR':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  const roleOptions = [
    { value: 'LEAD', label: 'Lead' },
    { value: 'SENIOR', label: 'Senior' },
    { value: 'MEMBER', label: 'Member' },
  ];
</script>

<svelte:head>
  <title>{team?.name || 'Team'} - PMO Platform</title>
</svelte:head>

{#if loading}
  <div class="flex h-64 items-center justify-center">
    <Spinner size="lg" />
  </div>
{:else if error}
  <Card class="p-6">
    <p class="text-center text-destructive">{error}</p>
    <div class="mt-4 flex justify-center gap-2">
      <Button variant="outline" on:click={() => goto('/teams')}>Back to Teams</Button>
      <Button on:click={loadTeam}>Retry</Button>
    </div>
  </Card>
{:else if team}
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="sm" href="/teams">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold">{team.name}</h1>
            {#if !team.isActive}
              <Badge variant="default">Inactive</Badge>
            {/if}
          </div>
          {#if team.description}
            <p class="text-muted-foreground">{team.description}</p>
          {/if}
        </div>
      </div>
      <Button variant="outline" on:click={() => (showEditModal = true)}>
        Edit Team
      </Button>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Users class="h-5 w-5" />
          </div>
          <div>
            <p class="text-2xl font-bold">{team.members.length}</p>
            <p class="text-sm text-muted-foreground">Members</p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <FolderKanban class="h-5 w-5" />
          </div>
          <div>
            <p class="text-2xl font-bold">{team.projectAssignments.length}</p>
            <p class="text-sm text-muted-foreground">Projects</p>
          </div>
        </div>
      </Card>

      {#if capacity}
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Clock class="h-5 w-5" />
            </div>
            <div>
              <p class="text-2xl font-bold">{capacity.totalCapacity}h</p>
              <p class="text-sm text-muted-foreground">Weekly Capacity</p>
            </div>
          </div>
        </Card>

        <Card class="p-4 {capacity.isOverAllocated ? 'border-red-500' : ''}">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg {capacity.isOverAllocated ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}">
              {#if capacity.isOverAllocated}
                <AlertTriangle class="h-5 w-5" />
              {:else}
                <Clock class="h-5 w-5" />
              {/if}
            </div>
            <div>
              <p class="text-2xl font-bold">{Math.round(capacity.utilizationPercent)}%</p>
              <p class="text-sm text-muted-foreground">
                {capacity.isOverAllocated ? 'Over-allocated!' : 'Utilization'}
              </p>
            </div>
          </div>
        </Card>
      {/if}
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Team Members -->
      <Card>
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="font-semibold">Team Members</h2>
          <Button size="sm" on:click={openAddMemberModal}>
            <UserPlus class="h-4 w-4" />
            Add Member
          </Button>
        </div>
        <div class="p-6">
          {#if team.members.length === 0}
            <EmptyState title="No members" description="Add team members to get started">
              <svelte:fragment slot="icon">
                <Users class="h-8 w-8" />
              </svelte:fragment>
            </EmptyState>
          {:else}
            <div class="space-y-3">
              {#each team.members as member}
                <div class="flex items-center justify-between rounded-lg border p-3">
                  <div class="flex items-center gap-3">
                    <Avatar
                      firstName={member.user.firstName}
                      lastName={member.user.lastName}
                      src={member.user.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <a href="/people/{member.user.id}" class="font-medium hover:underline">
                        {member.user.firstName} {member.user.lastName}
                      </a>
                      <p class="text-sm text-muted-foreground">{member.user.jobTitle || member.user.email}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <select
                      class="h-8 rounded border border-input bg-background px-2 text-sm"
                      value={member.role}
                      on:change={(e) => handleRoleChange(member, e)}
                    >
                      {#each roleOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                      {/each}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      on:click={() => removeMember(member)}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </Card>

      <!-- Project Assignments -->
      <Card>
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="font-semibold">Project Assignments</h2>
        </div>
        <div class="p-6">
          {#if team.projectAssignments.length === 0}
            <EmptyState title="No project assignments" description="This team isn't assigned to any projects yet">
              <svelte:fragment slot="icon">
                <FolderKanban class="h-8 w-8" />
              </svelte:fragment>
            </EmptyState>
          {:else}
            <div class="space-y-3">
              {#each team.projectAssignments as assignment}
                <a
                  href="/projects/{assignment.project?.id}"
                  class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p class="font-medium">{assignment.project?.name}</p>
                    <p class="text-sm text-muted-foreground">
                      {assignment.allocatedHours}h/week
                      <span class="mx-1">•</span>
                      <Badge variant="secondary" class="text-xs">{assignment.status}</Badge>
                    </p>
                  </div>
                  <ChevronRight class="h-4 w-4 text-muted-foreground" />
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </Card>
    </div>

    <!-- Skills -->
    {#if team.skills && team.skills.length > 0}
      <Card class="p-6">
        <h2 class="mb-4 font-semibold">Skills & Competencies</h2>
        <div class="flex flex-wrap gap-2">
          {#each team.skills as skill}
            <Badge variant="secondary">
              <Wrench class="mr-1 h-3 w-3" />
              {skill}
            </Badge>
          {/each}
        </div>
      </Card>
    {/if}
  </div>

  <!-- Edit Team Modal -->
  <TeamForm
    bind:open={showEditModal}
    {team}
    on:success={handleTeamUpdated}
  />

  <!-- Add Member Modal -->
  <Modal bind:open={showAddMemberModal} title="Add Team Member" size="md">
    <div class="space-y-4">
      <!-- Search Input -->
      <div class="space-y-1.5">
        <label for="userSearch" class="text-sm font-medium">Search Users</label>
        <input
          id="userSearch"
          type="text"
          placeholder="Search by name, email, or job title..."
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={userSearch}
        />
      </div>

      <!-- Selected User Display -->
      {#if selectedUser}
        <div class="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
          <div class="flex items-center gap-3">
            <Avatar
              firstName={selectedUser.firstName}
              lastName={selectedUser.lastName}
              src={selectedUser.avatarUrl}
              size="sm"
            />
            <div>
              <p class="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
              <p class="text-sm text-muted-foreground">{selectedUser.jobTitle || selectedUser.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" on:click={() => { selectedUserId = ''; selectedUser = null; }}>
            <X class="h-4 w-4" />
          </Button>
        </div>
      {/if}

      <!-- User List -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium">
          {selectedUser ? 'Change Selection' : 'Select User'}
          <span class="text-muted-foreground font-normal">({filteredUsers.length} available)</span>
        </label>
        <div class="max-h-48 overflow-y-auto rounded-md border">
          {#if filteredUsers.length === 0}
            <div class="p-4 text-center text-sm text-muted-foreground">
              {availableUsers.length === 0 ? 'No users available to add' : 'No users match your search'}
            </div>
          {:else}
            {#each filteredUsers as user}
              <button
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50 {selectedUserId === user.id ? 'bg-primary/10' : ''}"
                on:click={() => selectUser(user)}
              >
                <Avatar
                  firstName={user.firstName}
                  lastName={user.lastName}
                  src={user.avatarUrl}
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{user.firstName} {user.lastName}</p>
                  <p class="truncate text-sm text-muted-foreground">{user.jobTitle || user.email}</p>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Role Selection -->
      <div class="space-y-1.5">
        <label for="role" class="text-sm font-medium">Role</label>
        <select
          id="role"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          bind:value={selectedRole}
        >
          {#each roleOptions as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => (showAddMemberModal = false)}>Cancel</Button>
        <Button loading={addingMember} disabled={!selectedUserId} on:click={addMember}>
          Add Member
        </Button>
      </div>
    </svelte:fragment>
  </Modal>
{/if}
