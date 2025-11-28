<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type TimerShortcut, type Project, type Task } from '$lib/api/client';
  import { Card, Button, Modal, Input, Switch, EmptyState, Badge } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { Plus, Trash2, Pencil, ChevronUp, ChevronDown, Pin, Search } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let shortcuts: TimerShortcut[] = [];
  let loading = true;
  let activeTimer: any = null;

  // Modal state
  let showModal = false;
  let editingId: string | null = null;
  let saving = false;

  // Group rename state
  let showGroupRenameModal = false;
  let editingGroupName: string | null = null;
  let newGroupName = '';
  let savingGroupRename = false;

  // Form fields
  let selectedTaskId = '';
  let label = '';
  let description = '';
  let color = '#3B82F6';
  let icon = '⏱️';
  let groupName = '';
  let isPinned = false;

  // Task selection
  let projects: Project[] = [];
  let selectedProjectId = '';
  let projectTasks: Task[] = [];
  let searchQuery = '';

  // Get unique existing group names for autocomplete
  $: existingGroups = [...new Set(shortcuts
    .map(s => s.groupName)
    .filter(name => name && name.trim() !== '')
  )].sort();

  // Group shortcuts by groupName for display
  $: groupedShortcuts = shortcuts.reduce((groups, shortcut, index) => {
    const group = shortcut.groupName || 'Ungrouped';
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push({ ...shortcut, originalIndex: index });
    return groups;
  }, new Map<string, Array<TimerShortcut & { originalIndex: number }>>());

  // Predefined colors
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  // Common icons
  const icons = [
    '⏱️', '🎯', '💼', '📊', '🔧', '💡', '📝', '🚀',
    '⚙️', '🎨', '📱', '💻', '🏆', '⭐', '🔥', '✅',
  ];

  onMount(async () => {
    await Promise.all([loadShortcuts(), loadProjects(), loadActiveTimer()]);
  });

  async function loadShortcuts() {
    loading = true;
    try {
      shortcuts = await api.extension.getShortcuts();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to load shortcuts');
    } finally {
      loading = false;
    }
  }

  async function loadProjects() {
    try {
      const response = await api.projects.list({ limit: 100 });
      projects = response.data;
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  async function loadActiveTimer() {
    try {
      activeTimer = await api.timetracking.timer.active();
    } catch (err) {
      console.error('Failed to load active timer:', err);
    }
  }

  // Load tasks when project is selected
  $: if (selectedProjectId) {
    loadProjectTasks(selectedProjectId);
  }

  async function loadProjectTasks(projectId: string) {
    try {
      projectTasks = await api.projects.tasks.list(projectId);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      projectTasks = [];
    }
  }

  function openCreateModal() {
    editingId = null;
    selectedProjectId = '';
    selectedTaskId = '';
    label = '';
    description = '';
    color = colors[0];
    icon = icons[0];
    groupName = '';
    isPinned = false;
    showModal = true;
  }

  function openEditModal(shortcut: TimerShortcut) {
    editingId = shortcut.id;
    selectedTaskId = shortcut.taskId || '';
    label = shortcut.label;
    description = shortcut.description || '';
    color = shortcut.color;
    icon = shortcut.icon || icons[0];
    groupName = shortcut.groupName || '';
    isPinned = shortcut.isPinned;

    // Set project if task is assigned
    if (shortcut.task) {
      selectedProjectId = shortcut.task.projectId;
      loadProjectTasks(shortcut.task.projectId);
    }

    showModal = true;
  }

  async function saveShortcut() {
    if (!label.trim()) {
      toast.error('Label is required');
      return;
    }

    saving = true;

    try {
      if (editingId) {
        await api.extension.updateShortcut(editingId, {
          taskId: selectedTaskId || undefined,
          label: label.trim(),
          description: description.trim() || undefined,
          color,
          icon,
          groupName: groupName.trim() || undefined,
          isPinned,
        });
        toast.success('Shortcut updated');
      } else {
        await api.extension.createShortcut({
          taskId: selectedTaskId || undefined,
          label: label.trim(),
          description: description.trim() || undefined,
          color,
          icon,
          groupName: groupName.trim() || undefined,
          isPinned,
        });
        toast.success('Shortcut created');
      }

      showModal = false;
      await loadShortcuts();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save shortcut');
    } finally {
      saving = false;
    }
  }

  async function deleteShortcut(id: string) {
    const shortcut = shortcuts.find(s => s.id === id);
    if (!shortcut) return;

    // Check if there's an active timer for this shortcut's task
    const hasActiveTimer = activeTimer && shortcut.taskId && activeTimer.taskId === shortcut.taskId;

    const message = hasActiveTimer
      ? `⚠️ WARNING: You have an active timer running for this task!\n\nDeleting this shortcut will STOP the timer and discard the time.\n\nAre you sure you want to delete "${shortcut.label}"?`
      : `Delete "${shortcut.label}"?`;

    if (!confirm(message)) return;

    try {
      const result = await api.extension.deleteShortcut(id);

      if (result.stoppedTimer) {
        toast.success('Shortcut deleted and active timer stopped');
        await loadActiveTimer(); // Refresh active timer state
      } else {
        toast.success('Shortcut deleted');
      }

      await loadShortcuts();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete shortcut');
    }
  }

  async function moveShortcut(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= shortcuts.length) return;

    // Swap shortcuts
    const updated = [...shortcuts];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    // Update sortOrder for all shortcuts
    const reordered = updated.map((s, i) => ({
      id: s.id,
      sortOrder: i,
    }));

    try {
      await api.extension.reorderShortcuts(reordered);
      shortcuts = updated;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reorder shortcuts');
    }
  }

  function openGroupRenameModal(currentGroupName: string) {
    editingGroupName = currentGroupName;
    newGroupName = currentGroupName === 'Ungrouped' ? '' : currentGroupName;
    showGroupRenameModal = true;
  }

  async function saveGroupRename() {
    if (!editingGroupName) return;

    const trimmedNewName = newGroupName.trim();

    // Get all shortcuts in this group
    const shortcutsInGroup = shortcuts.filter(
      s => (s.groupName || 'Ungrouped') === editingGroupName
    );

    if (shortcutsInGroup.length === 0) return;

    savingGroupRename = true;

    try {
      // Update each shortcut in the group
      await Promise.all(
        shortcutsInGroup.map(shortcut =>
          api.extension.updateShortcut(shortcut.id, {
            ...shortcut,
            groupName: trimmedNewName || undefined,
          })
        )
      );

      toast.success(`Group renamed successfully`);
      showGroupRenameModal = false;
      await loadShortcuts();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to rename group');
    } finally {
      savingGroupRename = false;
    }
  }

  async function moveGroup(groupIndex: number, direction: 'up' | 'down') {
    const newGroupIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    const groupsArray = Array.from(groupedShortcuts.entries());

    if (newGroupIndex < 0 || newGroupIndex >= groupsArray.length) return;

    // Swap groups in the array
    const reorderedGroups = [...groupsArray];
    [reorderedGroups[groupIndex], reorderedGroups[newGroupIndex]] =
      [reorderedGroups[newGroupIndex], reorderedGroups[groupIndex]];

    // Flatten all groups back into a single shortcuts array in the new order
    const updated: TimerShortcut[] = [];
    reorderedGroups.forEach(([groupName, groupShortcuts]) => {
      // Remove the originalIndex property that we added for display
      groupShortcuts.forEach(({ originalIndex, ...shortcut }) => {
        updated.push(shortcut as TimerShortcut);
      });
    });

    // Update sortOrder for all shortcuts
    const reordered = updated.map((s, i) => ({
      id: s.id,
      sortOrder: i,
    }));

    try {
      await api.extension.reorderShortcuts(reordered);
      shortcuts = updated;
      toast.success('Group moved');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to move group');
    }
  }

  // Filtered tasks for search
  $: filteredTasks = projectTasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<svelte:head>
  <title>Timer Shortcuts - PMO</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Timer Shortcuts</h1>
      <p class="text-sm text-muted-foreground">
        Manage quick-access shortcuts for the Chrome extension timer
      </p>
    </div>
    {#if !loading && shortcuts.length > 0}
      <Button on:click={openCreateModal}>
        <Plus class="mr-2 h-4 w-4" />
        Create Shortcut
      </Button>
    {/if}
  </div>

  {#if loading}
    <Card class="p-12">
      <div class="flex items-center justify-center">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    </Card>
  {:else if shortcuts.length === 0}
    <EmptyState
      title="No shortcuts yet"
      description="Create your first timer shortcut to quickly track time in the Chrome extension"
    >
      <svelte:fragment slot="action">
        <Button on:click={openCreateModal}>
          <Plus class="mr-2 h-4 w-4" />
          Create First Shortcut
        </Button>
      </svelte:fragment>
    </EmptyState>
  {:else}
    <div class="space-y-6">
      {#each Array.from(groupedShortcuts.entries()) as [groupName, groupShortcuts], groupIndex}
        <!-- Group Container -->
        <div class="bg-muted/20 border border-muted-foreground/10 rounded-lg overflow-hidden">
          <!-- Group Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-muted-foreground/10 bg-muted/40">
            <h3 class="text-sm font-semibold text-foreground/90 uppercase tracking-wider">
              {groupName}
            </h3>
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                on:click={() => moveGroup(groupIndex, 'up')}
                disabled={groupIndex === 0}
                title="Move group up"
              >
                <ChevronUp class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                on:click={() => moveGroup(groupIndex, 'down')}
                disabled={groupIndex === groupedShortcuts.size - 1}
                title="Move group down"
              >
                <ChevronDown class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                on:click={() => openGroupRenameModal(groupName)}
                title="Rename group"
              >
                <Pencil class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Shortcuts in this group -->
          <div class="grid gap-3 p-4">
            {#each groupShortcuts as shortcut}
              <Card class="p-4">
                <div class="flex items-center gap-4">
                  <!-- Icon and Color -->
                  <div
                    class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl"
                    style="background-color: {shortcut.color}"
                  >
                    {shortcut.icon || '⏱️'}
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="font-medium truncate">{shortcut.label}</h3>
                      {#if shortcut.isPinned}
                        <Badge variant="secondary" class="flex items-center gap-1">
                          <Pin class="h-3 w-3" />
                          Pinned
                        </Badge>
                      {/if}
                    </div>
                    {#if shortcut.description}
                      <p class="text-sm text-muted-foreground truncate">{shortcut.description}</p>
                    {/if}
                    {#if shortcut.task}
                      <p class="text-xs text-muted-foreground mt-1">
                        {shortcut.task.project.code} - {shortcut.task.title}
                      </p>
                    {/if}
                    <p class="text-xs text-muted-foreground mt-1">
                      Used {shortcut.useCount} time{shortcut.useCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => moveShortcut(shortcut.originalIndex, 'up')}
                      disabled={shortcut.originalIndex === 0}
                    >
                      <ChevronUp class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => moveShortcut(shortcut.originalIndex, 'down')}
                      disabled={shortcut.originalIndex === shortcuts.length - 1}
                    >
                      <ChevronDown class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => openEditModal(shortcut)}
                    >
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => deleteShortcut(shortcut.id)}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Create/Edit Modal -->
<Modal bind:open={showModal} title={editingId ? 'Edit Shortcut' : 'Create Shortcut'} size="lg">
  <form on:submit|preventDefault={saveShortcut} class="space-y-4">
    <!-- Label -->
    <Input
      id="label"
      label="Label"
      placeholder="e.g., Daily Standup"
      bind:value={label}
      required
    />

    <!-- Description -->
    <div class="space-y-2">
      <label for="description" class="text-sm font-medium">Description (optional)</label>
      <textarea
        id="description"
        bind:value={description}
        placeholder="Add more details..."
        rows="2"
        class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      ></textarea>
    </div>

    <!-- Project Selection -->
    <div class="space-y-2">
      <label for="project" class="text-sm font-medium">Project (optional)</label>
      <select
        id="project"
        bind:value={selectedProjectId}
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">No project</option>
        {#each projects as project}
          <option value={project.id}>{project.code} - {project.name}</option>
        {/each}
      </select>
    </div>

    <!-- Task Selection -->
    {#if selectedProjectId}
      <div class="space-y-2">
        <label for="task" class="text-sm font-medium">Task (optional)</label>
        <select
          id="task"
          bind:value={selectedTaskId}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">No specific task</option>
          {#each projectTasks as task}
            <option value={task.id}>{task.title}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Color Picker -->
    <div class="space-y-2">
      <label class="text-sm font-medium">Color</label>
      <div class="flex gap-2">
        {#each colors as c}
          <button
            type="button"
            class="h-10 w-10 rounded-md border-2 transition-all hover:scale-110"
            class:ring-2={color === c}
            class:ring-offset-2={color === c}
            style="background-color: {c}"
            on:click={() => color = c}
          ></button>
        {/each}
      </div>
    </div>

    <!-- Icon Picker -->
    <div class="space-y-2">
      <label class="text-sm font-medium">Icon</label>
      <div class="grid grid-cols-8 gap-2">
        {#each icons as i}
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-md border-2 text-xl transition-all hover:scale-110"
            class:ring-2={icon === i}
            class:ring-offset-2={icon === i}
            on:click={() => icon = i}
          >
            {i}
          </button>
        {/each}
      </div>
    </div>

    <!-- Group Name with Autocomplete -->
    <div class="space-y-2">
      <label for="groupName" class="text-sm font-medium">
        Group Name (optional)
      </label>
      <input
        type="text"
        id="groupName"
        list="groupNameSuggestions"
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={existingGroups.length > 0 ? "Select existing or type new group" : "e.g., Client Work, Internal"}
        bind:value={groupName}
      />
      {#if existingGroups.length > 0}
        <datalist id="groupNameSuggestions">
          {#each existingGroups as group}
            <option value={group}>{group}</option>
          {/each}
        </datalist>
        <p class="text-xs text-muted-foreground">
          {existingGroups.length} existing group{existingGroups.length !== 1 ? 's' : ''}: {existingGroups.join(', ')}
        </p>
      {/if}
    </div>

    <!-- Pin to Popup -->
    <div class="flex items-center justify-between rounded-lg border p-4">
      <div>
        <div class="text-sm font-medium">Pin to popup</div>
        <div class="text-xs text-muted-foreground">
          Show in extension popup (max 6 pinned shortcuts)
        </div>
      </div>
      <Switch bind:checked={isPinned} />
    </div>
  </form>

  <div slot="footer" class="flex justify-end gap-2">
    <Button variant="outline" on:click={() => showModal = false}>
      Cancel
    </Button>
    <Button on:click={saveShortcut} loading={saving}>
      {editingId ? 'Update' : 'Create'} Shortcut
    </Button>
  </div>
</Modal>

<!-- Group Rename Modal -->
<Modal bind:open={showGroupRenameModal} title="Rename Group" size="sm">
  <form on:submit|preventDefault={saveGroupRename} class="space-y-4">
    <Input
      id="newGroupName"
      label="Group Name"
      placeholder={editingGroupName === 'Ungrouped' ? 'Enter group name' : 'Enter new group name'}
      bind:value={newGroupName}
      required={editingGroupName !== 'Ungrouped'}
    />
    {#if editingGroupName === 'Ungrouped'}
      <p class="text-xs text-muted-foreground">
        Leave empty to keep shortcuts ungrouped
      </p>
    {/if}
    <p class="text-sm text-muted-foreground">
      This will rename the group for all {shortcuts.filter(s => (s.groupName || 'Ungrouped') === editingGroupName).length} shortcut{shortcuts.filter(s => (s.groupName || 'Ungrouped') === editingGroupName).length !== 1 ? 's' : ''} in this group.
    </p>
  </form>

  <div slot="footer" class="flex justify-end gap-2">
    <Button variant="outline" on:click={() => showGroupRenameModal = false}>
      Cancel
    </Button>
    <Button on:click={saveGroupRename} loading={savingGroupRename}>
      Rename Group
    </Button>
  </div>
</Modal>
