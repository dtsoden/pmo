<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { api, type TimeEntry, type ActiveTimer, type Task, type Project } from '$lib/api/client';
  import { ws } from '$lib/stores/websocket';
  import { Card, Button, Badge, Spinner, EmptyState, Modal, Select } from '$components/shared';
  import { cn, formatDate, formatHours, debounce } from '$lib/utils';
  import { Play, Square, Plus, Clock, Calendar, Trash2, Pencil, ChevronDown, ChevronRight, Timer } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  // Get userId from query params (for "View All" from people page)
  $: userId = $page?.url?.searchParams?.get('userId') ?? undefined;

  let entries: TimeEntry[] = [];
  let activeTimer: ActiveTimer | null = null;
  let loading = true;
  let timerLoading = false;
  let error = '';

  // Extension detection
  let isExtensionInstalled = false;

  // Timer display
  let elapsedSeconds = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  // Week navigation
  let currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  let selectedDay: Date | null = null; // For filtering entries by day

  // New entry modal
  let showNewEntryModal = false;
  let projects: Project[] = [];
  let selectedProjectId = '';
  let projectTasks: Task[] = [];
  let selectedTaskId = '';
  let entryDate = format(new Date(), 'yyyy-MM-dd');
  let entryHours = '';
  let entryDescription = '';
  let entryBillable = true;
  let saving = false;

  // Edit entry modal
  let showEditEntryModal = false;
  let editingEntryId = '';
  let editProjectId = '';
  let editTaskId = '';
  let editDate = '';
  let editHours = '';
  let editDescription = '';
  let editBillable = true;
  let editIsTimerBased = false;
  let editProjectTasks: Task[] = [];

  // Add session modal
  let showAddSessionModal = false;
  let addSessionStart = '';
  let addSessionEnd = '';
  let addSessionDescription = '';

  // Task search for timer
  let showTimerModal = false;
  let timerTaskId = '';
  let timerDescription = '';

  // Session expand/collapse
  let expandedEntries = new Set<string>();

  function toggleExpanded(entryId: string) {
    if (expandedEntries.has(entryId)) {
      expandedEntries.delete(entryId);
    } else {
      expandedEntries.add(entryId);
    }
    expandedEntries = expandedEntries; // Trigger reactivity
  }

  // Edit session
  let showEditSessionModal = false;
  let editingSessionId = '';
  let editSessionStart = '';
  let editSessionEnd = '';
  let editSessionDescription = '';
  let editSessionBillable = true;

  function openEditSessionModal(entry: TimeEntry, session: any) {
    editingSessionId = session.id;
    editingEntryId = entry.id;
    editSessionStart = format(parseISO(session.startTime), "yyyy-MM-dd'T'HH:mm");
    editSessionEnd = format(parseISO(session.endTime), "yyyy-MM-dd'T'HH:mm");
    editSessionDescription = session.description || '';
    editSessionBillable = session.isBillable ?? true;
    showEditSessionModal = true;
  }

  async function saveSession() {
    if (!editSessionStart || !editSessionEnd) {
      toast.error('Start and end times are required');
      return;
    }

    saving = true;

    try {
      const updatedEntry = await api.timetracking.sessions.update(editingSessionId, {
        startTime: new Date(editSessionStart).toISOString(),
        endTime: new Date(editSessionEnd).toISOString(),
        description: editSessionDescription || undefined,
        isBillable: editSessionBillable,
      });

      // Update entry in list
      const index = entries.findIndex(e => e.id === editingEntryId);
      if (index >= 0) {
        entries[index] = updatedEntry;
        entries = entries;
      }

      showEditSessionModal = false;
      toast.success('Session updated');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update session');
    } finally {
      saving = false;
    }
  }

  async function deleteSessionHandler(entry: TimeEntry, sessionId: string) {
    if (!confirm('Delete this session?')) return;

    try {
      const updatedEntry = await api.timetracking.sessions.delete(sessionId);

      // Update entry in list
      const index = entries.findIndex(e => e.id === entry.id);
      if (index >= 0) {
        entries[index] = updatedEntry;
        entries = entries;
      }

      toast.success('Session deleted');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete session');
    }
  }

  $: weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  $: weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  $: entriesByDay = weekDays.map((day) => ({
    date: day,
    entries: entries.filter((e) => isSameDay(parseISO(e.date), day)),
    total: entries
      .filter((e) => isSameDay(parseISO(e.date), day))
      .reduce((sum, e) => sum + e.hours, 0),
  }));

  $: weekTotal = entries.reduce((sum, e) => sum + e.hours, 0);

  $: filteredEntries = selectedDay
    ? entries.filter((e) => isSameDay(parseISO(e.date), selectedDay))
    : entries;

  async function loadData() {
    loading = true;
    error = '';

    try {
      const [entriesRes, timerRes, projectsRes] = await Promise.all([
        api.timetracking.entries.list({
          userId,
          startDate: format(currentWeekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
          limit: 100,
        }),
        api.timetracking.timer.active(),
        api.projects.list({ status: 'ACTIVE', limit: 100 }),
      ]);

      entries = entriesRes.data || [];
      activeTimer = timerRes;
      projects = projectsRes.data || [];

      if (activeTimer) {
        startTimerDisplay();
      }
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load time tracking data';
    } finally {
      loading = false;
    }
  }

  // Refresh only the active timer (for real-time updates from extension)
  async function refreshActiveTimer() {
    try {
      const timerRes = await api.timetracking.timer.active();
      activeTimer = timerRes;

      if (activeTimer) {
        startTimerDisplay();
      } else {
        stopTimerDisplay();
      }
    } catch (err) {
      console.error('Failed to refresh active timer:', err);
    }
  }

  function startTimerDisplay() {
    if (!activeTimer) return;

    const startTime = new Date(activeTimer.startTime).getTime();
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsedSeconds++;
    }, 1000);
  }

  function stopTimerDisplay() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    elapsedSeconds = 0;
  }

  function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async function startTimer() {
    if (!timerTaskId) {
      toast.error('Please select a task');
      return;
    }

    timerLoading = true;

    try {
      activeTimer = await api.timetracking.timer.start({
        taskId: timerTaskId,
        description: timerDescription || undefined,
      });
      startTimerDisplay();
      showTimerModal = false;
      timerTaskId = '';
      timerDescription = '';
      toast.success('Timer started');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to start timer');
    } finally {
      timerLoading = false;
    }
  }

  async function stopTimer() {
    timerLoading = true;

    try {
      const entry = await api.timetracking.timer.stop();
      activeTimer = null;
      stopTimerDisplay();

      // Update existing entry or add new one
      const existingIndex = entries.findIndex(e => e.id === entry.id);
      if (existingIndex >= 0) {
        entries[existingIndex] = entry; // Update existing
        entries = entries; // Trigger reactivity
      } else {
        entries = [entry, ...entries]; // Add new
      }

      toast.success('Timer stopped - session added');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to stop timer');
    } finally {
      timerLoading = false;
    }
  }

  async function continueTimer(entry: TimeEntry) {
    if (activeTimer) {
      toast.error('Stop the current timer first');
      return;
    }

    timerLoading = true;

    try {
      activeTimer = await api.timetracking.timer.start({
        taskId: entry.taskId,
        description: undefined,
      });
      startTimerDisplay();
      toast.success('Timer started on ' + (entry.task?.title || 'task'));
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to start timer');
    } finally {
      timerLoading = false;
    }
  }

  async function loadProjectTasks() {
    if (!selectedProjectId) {
      projectTasks = [];
      return;
    }

    try {
      projectTasks = await api.projects.tasks.list(selectedProjectId);
    } catch {
      projectTasks = [];
    }
  }

  async function saveEntry() {
    if (!selectedTaskId || !entryHours) {
      toast.error('Please fill in all required fields');
      return;
    }

    saving = true;

    try {
      const newEntry = await api.timetracking.entries.create({
        taskId: selectedTaskId,
        date: entryDate,
        hours: parseFloat(entryHours),
        description: entryDescription || undefined,
        isBillable: entryBillable,
      });

      entries = [newEntry, ...entries];
      showNewEntryModal = false;
      resetEntryForm();
      toast.success('Time entry saved');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save entry');
    } finally {
      saving = false;
    }
  }

  async function openEditModal(entry: TimeEntry) {
    editingEntryId = entry.id;
    editTaskId = entry.taskId || '';
    editProjectId = entry.task?.projectId || '';
    editDate = format(parseISO(entry.date), 'yyyy-MM-dd');
    editHours = entry.hours.toString();
    editDescription = entry.sessions?.[0]?.description || '';
    editBillable = entry.isBillable;
    editIsTimerBased = entry.isTimerBased;

    // Load project tasks
    if (editProjectId) {
      try {
        editProjectTasks = await api.projects.tasks.list(editProjectId);
      } catch {
        editProjectTasks = [];
      }
    }

    showEditEntryModal = true;
  }

  async function updateEntry() {
    saving = true;

    try {
      const updateData: any = { isBillable: editBillable };

      // Only send hours for manual entries
      if (!editIsTimerBased && editHours) {
        updateData.hours = parseFloat(editHours);
      }

      const updatedEntry = await api.timetracking.entries.update(editingEntryId, updateData);

      entries = entries.map((e) => (e.id === editingEntryId ? updatedEntry : e));
      showEditEntryModal = false;
      resetEditForm();
      toast.success('Time entry updated');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update entry');
    } finally {
      saving = false;
    }
  }

  async function addManualSession() {
    if (!addSessionStart || !addSessionEnd) {
      toast.error('Start and end times are required');
      return;
    }

    saving = true;

    try {
      const updatedEntry = await api.timetracking.entries.addSession(editingEntryId, {
        startTime: new Date(addSessionStart).toISOString(),
        endTime: new Date(addSessionEnd).toISOString(),
        description: addSessionDescription || undefined,
      });

      // Update entry in list
      const index = entries.findIndex(e => e.id === editingEntryId);
      if (index >= 0) {
        entries[index] = updatedEntry;
        entries = entries;
      }

      showAddSessionModal = false;
      toast.success('Session added');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to add session');
    } finally {
      saving = false;
    }
  }

  function resetEditForm() {
    editingEntryId = '';
    editProjectId = '';
    editTaskId = '';
    editDate = '';
    editHours = '';
    editDescription = '';
    editBillable = true;
    editProjectTasks = [];
  }

  async function loadEditProjectTasks() {
    if (!editProjectId) {
      editProjectTasks = [];
      return;
    }

    try {
      editProjectTasks = await api.projects.tasks.list(editProjectId);
    } catch {
      editProjectTasks = [];
    }
  }

  async function deleteEntry(id: string) {
    try {
      await api.timetracking.entries.delete(id);
      entries = entries.filter((e) => e.id !== id);
      toast.success('Entry deleted');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete entry');
    }
  }

  function resetEntryForm() {
    selectedProjectId = '';
    selectedTaskId = '';
    entryDate = format(new Date(), 'yyyy-MM-dd');
    entryHours = '';
    entryDescription = '';
    entryBillable = true;
    projectTasks = [];
  }

  function selectDay(date: Date) {
    // Toggle selection if clicking the same day
    if (selectedDay && isSameDay(selectedDay, date)) {
      selectedDay = null;
      return;
    }

    selectedDay = date;
  }

  function openNewEntryModal() {
    // Use selected day if available, otherwise use today
    entryDate = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    showNewEntryModal = true;
  }

  function previousWeek() {
    currentWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    loadData();
  }

  function nextWeek() {
    currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    loadData();
  }

  function thisWeek() {
    currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    loadData();
  }

  onMount(() => {
    loadData();

    // Listen for real-time updates
    const unsubEntryCreated = ws.on('time:entry:created', () => loadData());

    // Listen for timer events (for real-time sync with extension)
    const unsubTimerStarted = ws.on('time:started', (data: any) => {
      console.log('Timer started event received:', data);
      refreshActiveTimer();
    });

    const unsubTimerStopped = ws.on('time:stopped', (data: any) => {
      console.log('Timer stopped event received:', data);
      refreshActiveTimer();
      loadData(); // Reload entries to show the newly created entry
    });

    const unsubTimerUpdated = ws.on('time:updated', (data: any) => {
      console.log('Timer updated event received:', data);
      refreshActiveTimer();
    });

    // Check if Chrome extension is installed
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'PMO_EXTENSION_READY') {
        isExtensionInstalled = true;
      }
    };

    window.addEventListener('message', handleExtensionMessage);

    // Actively ping the extension to check if it's installed
    setTimeout(() => {
      window.postMessage({ type: 'PMO_EXTENSION_PING' }, window.location.origin);
    }, 100);

    return () => {
      unsubEntryCreated();
      unsubTimerStarted();
      unsubTimerStopped();
      unsubTimerUpdated();
      stopTimerDisplay();
      window.removeEventListener('message', handleExtensionMessage);
    };
  });

  $: projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  $: taskOptions = projectTasks.map((t) => ({ value: t.id, label: t.title }));
  $: editTaskOptions = editProjectTasks.map((t) => ({ value: t.id, label: t.title }));
</script>

<svelte:head>
  <title>Time Tracking - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Time Tracking</h1>
      <p class="text-muted-foreground">Track your work hours and manage time entries</p>
    </div>
    <div class="flex gap-2">
      {#if activeTimer}
        <Button variant="destructive" on:click={stopTimer} loading={timerLoading}>
          <Square class="h-4 w-4" />
          Stop Timer
        </Button>
      {:else}
        <Button variant="outline" on:click={() => (showTimerModal = true)}>
          <Play class="h-4 w-4" />
          Start Timer
        </Button>
      {/if}
      <Button on:click={openNewEntryModal}>
        <Plus class="h-4 w-4" />
        Add Entry
      </Button>
    </div>
  </div>

  <!-- Extension Promotion Banner (hide if extension is installed) -->
  {#if !isExtensionInstalled}
    <Card class="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Timer class="h-5 w-5" />
          </div>
          <div>
            <h3 class="font-medium">Get the Chrome Extension</h3>
            <p class="text-sm text-muted-foreground">
              Quick-access timer with custom shortcuts for faster time tracking
            </p>
          </div>
        </div>
        <a href="/settings/extension">
          <Button size="sm" variant="default">
            Learn More & Setup
          </Button>
        </a>
      </div>
    </Card>
  {/if}

  <!-- Active Timer -->
  {#if activeTimer}
    <Card class="border-primary bg-primary/5 p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Clock class="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p class="font-medium">{activeTimer.task?.title || activeTimer.description || 'Timer Running'}</p>
            <p class="text-sm text-muted-foreground">
              {activeTimer.task?.project?.name || 'No project'}
              {#if activeTimer.description && activeTimer.task?.title}
                - {activeTimer.description}
              {/if}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-mono text-3xl font-bold text-primary">{formatElapsed(elapsedSeconds)}</p>
          <p class="text-sm text-muted-foreground">
            Started at {activeTimer.startTime ? format(new Date(activeTimer.startTime), 'h:mm a') : 'Unknown'}
          </p>
        </div>
      </div>
    </Card>
  {/if}

  <!-- Week Navigation -->
  <Card class="p-4">
    <div class="flex items-center justify-between">
      <Button variant="outline" size="sm" on:click={previousWeek}>Previous</Button>
      <div class="flex items-center gap-4">
        <h2 class="font-semibold">
          {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <Button variant="ghost" size="sm" on:click={thisWeek}>Today</Button>
      </div>
      <Button variant="outline" size="sm" on:click={nextWeek}>Next</Button>
    </div>
  </Card>

  <!-- Time Entries -->
  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadData}>Retry</Button>
      </div>
    </Card>
  {:else}
    <!-- Week Summary -->
    <div class="grid gap-4 md:grid-cols-7">
      {#each entriesByDay as day}
        <button
          on:click={() => selectDay(day.date)}
          class="text-left"
        >
          <Card class={cn(
            'p-4 transition-all hover:shadow-md hover:border-primary/50 cursor-pointer',
            isSameDay(day.date, new Date()) && 'border-primary',
            selectedDay && isSameDay(selectedDay, day.date) && 'ring-2 ring-primary bg-primary/5'
          )}>
            <div class="text-center">
              <p class="text-xs text-muted-foreground">{format(day.date, 'EEE')}</p>
              <p class="font-semibold">{format(day.date, 'd')}</p>
              <p class={cn('mt-2 text-lg font-bold', day.total > 0 ? 'text-primary' : 'text-muted-foreground')}>
                {day.total > 0 ? formatHours(day.total) : '-'}
              </p>
            </div>
          </Card>
        </button>
      {/each}
    </div>

    <!-- Week Total -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <span class="font-medium">Week Total</span>
        <span class="text-2xl font-bold text-primary">{formatHours(weekTotal)}</span>
      </div>
    </Card>

    <!-- Entries List -->
    <Card>
      <div class="border-b px-6 py-4 flex items-center justify-between">
        <h2 class="font-semibold">
          Time Entries
          {#if selectedDay}
            <span class="text-muted-foreground font-normal"> · {format(selectedDay, 'EEEE, MMM d')}</span>
          {/if}
        </h2>
        {#if selectedDay}
          <Button variant="ghost" size="sm" on:click={() => selectedDay = null}>
            Show All
          </Button>
        {/if}
      </div>
      {#if filteredEntries.length === 0}
        <EmptyState
          title={selectedDay ? `No time entries for ${format(selectedDay, 'MMM d')}` : "No time entries"}
          description="Start tracking time or add manual entries"
          class="py-8"
        >
          <svelte:fragment slot="icon">
            <Clock class="h-12 w-12" />
          </svelte:fragment>
        </EmptyState>
      {:else}
        <div class="divide-y">
          {#each filteredEntries as entry}
            <div>
              <div class="flex items-center justify-between px-6 py-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    {#if entry.isTimerBased && entry.sessions && entry.sessions.length > 0}
                      <button
                        class="text-muted-foreground hover:text-foreground"
                        on:click={() => toggleExpanded(entry.id)}
                      >
                        {#if expandedEntries.has(entry.id)}
                          <ChevronDown class="h-4 w-4" />
                        {:else}
                          <ChevronRight class="h-4 w-4" />
                        {/if}
                      </button>
                    {/if}
                    <p class="font-medium">{entry.task?.title || 'Unknown Task'}</p>
                    {#if entry.isTimerBased}
                      <Badge variant="outline"><Timer class="h-3 w-3 mr-1" />Timer</Badge>
                      {#if !entry.sessions || entry.sessions.length === 0}
                        <Badge variant="destructive" class="text-xs">No sessions</Badge>
                      {/if}
                    {:else}
                      <Badge variant="secondary">Manual</Badge>
                    {/if}
                  </div>
                  <p class="text-sm text-muted-foreground">
                    {entry.task?.project?.name || 'Unknown Project'}
                    {#if entry.sessions && entry.sessions.length > 0}
                      - {entry.sessions.length} session{entry.sessions.length > 1 ? 's' : ''}
                    {:else if entry.isTimerBased}
                      - Incomplete timer entry
                    {/if}
                  </p>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <p class="font-semibold">{formatHours(entry.hours)}</p>
                    <p class="text-sm text-muted-foreground">
                      {entry.billableHours > 0 ? `${formatHours(entry.billableHours)} billable` : 'Non-billable'} · {formatDate(entry.date)}
                    </p>
                  </div>
                  <div class="flex gap-1">
                    {#if entry.isTimerBased}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="text-green-600 hover:bg-green-600/10"
                        on:click={() => continueTimer(entry)}
                        disabled={!!activeTimer}
                        title="Continue timer on this task"
                      >
                        <Play class="h-4 w-4" />
                      </Button>
                    {/if}
                    <Button
                      variant="ghost"
                      size="icon"
                      class="text-primary hover:bg-primary/10"
                      on:click={() => openEditModal(entry)}
                    >
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="text-destructive hover:bg-destructive/10"
                      on:click={() => deleteEntry(entry.id)}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <!-- Sessions List (Expanded) -->
              {#if entry.isTimerBased && expandedEntries.has(entry.id) && entry.sessions}
                <div class="px-6 pb-4 bg-muted/30">
                  <div class="ml-6 space-y-2">
                    <p class="text-xs font-medium text-muted-foreground mb-2">SESSIONS</p>
                    {#each entry.sessions as session}
                      <div class="flex items-center justify-between text-sm bg-background rounded p-3">
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <p class="text-xs text-muted-foreground">
                              {format(parseISO(session.startTime), 'h:mm a')} - {format(parseISO(session.endTime), 'h:mm a')}
                            </p>
                            {#if session.isBillable}
                              <Badge variant="success" class="text-xs">Billable</Badge>
                            {:else}
                              <Badge variant="secondary" class="text-xs">Non-billable</Badge>
                            {/if}
                          </div>
                          <p class="mt-1">{session.description || 'No description'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                          <p class="font-medium mr-2">{formatHours(session.duration)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            class="h-7 text-primary hover:bg-primary/10"
                            on:click={() => openEditSessionModal(entry, session)}
                          >
                            <Pencil class="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            class="h-7 text-destructive hover:bg-destructive/10"
                            on:click={() => deleteSessionHandler(entry, session.id)}
                          >
                            <Trash2 class="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {/if}
</div>

<!-- Start Timer Modal -->
<Modal bind:open={showTimerModal} title="Start Timer" size="md">
  <div class="space-y-4">
    <Select
      label="Project"
      options={[{ value: '', label: 'Select Project' }, ...projectOptions]}
      bind:value={selectedProjectId}
      on:change={loadProjectTasks}
    />

    <Select
      label="Task"
      options={[{ value: '', label: 'Select Task' }, ...taskOptions]}
      bind:value={timerTaskId}
      disabled={!selectedProjectId}
    />

    <div class="space-y-1.5">
      <label for="timerDescription" class="text-sm font-medium">Description (Optional)</label>
      <input
        id="timerDescription"
        type="text"
        placeholder="What are you working on?"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={timerDescription}
      />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (showTimerModal = false)}>Cancel</Button>
      <Button loading={timerLoading} on:click={startTimer}>
        <Play class="h-4 w-4" />
        Start Timer
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- New Entry Modal -->
<Modal bind:open={showNewEntryModal} title="Add Time Entry" size="md">
  <div class="space-y-4">
    <Select
      label="Project"
      options={[{ value: '', label: 'Select Project' }, ...projectOptions]}
      bind:value={selectedProjectId}
      on:change={loadProjectTasks}
      required
    />

    <Select
      label="Task"
      options={[{ value: '', label: 'Select Task' }, ...taskOptions]}
      bind:value={selectedTaskId}
      disabled={!selectedProjectId}
      required
    />

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-1.5">
        <label for="entryDate" class="text-sm font-medium">Date</label>
        <input
          id="entryDate"
          type="date"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={entryDate}
        />
      </div>

      <div class="space-y-1.5">
        <label for="entryHours" class="text-sm font-medium">Hours</label>
        <input
          id="entryHours"
          type="number"
          step="0.25"
          min="0"
          placeholder="0.00"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={entryHours}
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <label for="entryDescription" class="text-sm font-medium">Description (Optional)</label>
      <textarea
        id="entryDescription"
        rows="2"
        placeholder="What did you work on?"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={entryDescription}
      />
    </div>

    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={entryBillable} class="rounded border-input" />
      <span class="text-sm">Billable</span>
    </label>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => { showNewEntryModal = false; resetEntryForm(); }}>
        Cancel
      </Button>
      <Button loading={saving} on:click={saveEntry}>Save Entry</Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Edit Entry Modal -->
<Modal bind:open={showEditEntryModal} title="Edit Time Entry" size="sm">
  <div class="space-y-4">
    {#if editIsTimerBased}
      <p class="text-sm text-muted-foreground">
        This is a timer entry. Expand the entry to edit individual sessions, or add a new session below.
      </p>

      <Button
        variant="outline"
        class="w-full"
        on:click={() => {
          showEditEntryModal = false;
          addSessionStart = format(parseISO(editDate), "yyyy-MM-dd'T'08:00");
          addSessionEnd = format(parseISO(editDate), "yyyy-MM-dd'T'09:00");
          addSessionDescription = '';
          // Delay opening add session modal to allow edit modal to close first
          setTimeout(() => {
            showAddSessionModal = true;
          }, 50);
        }}
      >
        <Plus class="h-4 w-4 mr-2" />
        Add Session
      </Button>
    {:else}
      <p class="text-sm text-muted-foreground">
        This is a manual entry. You can edit the hours directly.
      </p>

      <div>
        <label class="block text-sm font-medium mb-1">Hours</label>
        <input
          type="number"
          step="0.25"
          min="0"
          bind:value={editHours}
          class="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </div>
    {/if}

    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={editBillable} class="rounded border-input" />
      <span class="text-sm">Billable</span>
    </label>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => { showEditEntryModal = false; resetEditForm(); }}>
        Cancel
      </Button>
      <Button loading={saving} on:click={updateEntry}>Update Entry</Button>
    </div>
  </svelte:fragment>
</Modal>

<!-- Edit Session Modal -->
<Modal bind:open={showEditSessionModal} title="Edit Session" size="sm">
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1">Start Time</label>
      <input
        type="datetime-local"
        bind:value={editSessionStart}
        class="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1">End Time</label>
      <input
        type="datetime-local"
        bind:value={editSessionEnd}
        class="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1">Description</label>
      <textarea
        bind:value={editSessionDescription}
        class="w-full rounded-md border border-input bg-background px-3 py-2"
        rows="3"
        placeholder="What did you work on?"
      ></textarea>
    </div>

    <div class="flex items-center gap-2">
      <input
        type="checkbox"
        id="editSessionBillable"
        bind:checked={editSessionBillable}
        class="h-4 w-4 rounded border-input"
      />
      <label for="editSessionBillable" class="text-sm font-medium cursor-pointer">
        Billable
      </label>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => showEditSessionModal = false}>
        Cancel
      </Button>
      <Button loading={saving} on:click={saveSession}>Save Session</Button>
    </div>
  </svelte:fragment>
</Modal>
