<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { api, type TimeOffRequest } from '$lib/api/client';
  import { user } from '$lib/stores/auth';
  import { Card, Button, Badge, Spinner } from '$components/shared';
  import {
    cn,
    formatDate,
    getTimeOffStatusVariant,
    TIME_OFF_STATUS_LABELS,
    TIME_OFF_TYPE_LABELS,
  } from '$lib/utils';
  import { Calendar, Plus, X, Trash2 } from 'lucide-svelte';
  import { format } from 'date-fns';

  // SvelteKit props
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let myRequests: TimeOffRequest[] = [];
  let loading = true;
  let error = '';
  let showRequestForm = false;

  // Form state
  let requestForm = {
    type: 'VACATION' as 'VACATION' | 'SICK' | 'PERSONAL' | 'HOLIDAY' | 'OTHER',
    startDate: '',
    endDate: '',
    hours: 8,
    reason: '',
  };

  const typeOptions = [
    { value: 'VACATION', label: 'Vacation' },
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'OTHER', label: 'Other' },
  ];

  async function loadMyRequests() {
    if (!$user) return;
    loading = true;
    error = '';

    try {
      const response = await api.capacity.timeOff.list({ userId: $user.id, limit: 100 });
      myRequests = response.data || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load requests';
    } finally {
      loading = false;
    }
  }

  async function submitRequest() {
    if (!requestForm.startDate || !requestForm.endDate) {
      error = 'Start date and end date are required';
      return;
    }

    try {
      await api.capacity.timeOff.create({
        type: requestForm.type,
        startDate: new Date(requestForm.startDate),
        endDate: new Date(requestForm.endDate),
        hours: requestForm.hours,
        reason: requestForm.reason || null,
      });

      // Reset form
      requestForm = {
        type: 'VACATION',
        startDate: '',
        endDate: '',
        hours: 8,
        reason: '',
      };
      showRequestForm = false;

      // Reload requests
      await loadMyRequests();
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to submit request';
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      await api.capacity.timeOff.cancel(id);
      await loadMyRequests();
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to cancel request';
    }
  }

  onMount(() => {
    if (browser && $user) {
      loadMyRequests();
    }
  });

  $: if (browser && $user) {
    loadMyRequests();
  }

  $: pendingRequests = myRequests.filter(r => r.status === 'PENDING');
  $: approvedRequests = myRequests.filter(r => r.status === 'APPROVED');
  $: rejectedRequests = myRequests.filter(r => r.status === 'REJECTED');
</script>

<svelte:head>
  <title>My Leave Requests - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">My Leave Requests</h1>
      <p class="text-muted-foreground">Request and manage your time off</p>
    </div>
    <Button on:click={() => (showRequestForm = !showRequestForm)}>
      {#if showRequestForm}
        <X class="mr-2 h-4 w-4" />
        Cancel
      {:else}
        <Plus class="mr-2 h-4 w-4" />
        New Request
      {/if}
    </Button>
  </div>

  {#if error}
    <Card class="border-destructive bg-destructive/10 p-4">
      <p class="text-sm text-destructive">{error}</p>
    </Card>
  {/if}

  <!-- Request Form -->
  {#if showRequestForm}
    <Card class="p-6">
      <h2 class="mb-4 text-lg font-semibold">Submit Leave Request</h2>
      <form on:submit|preventDefault={submitRequest} class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Type -->
          <div>
            <label for="type" class="mb-2 block text-sm font-medium">Type</label>
            <select
              id="type"
              bind:value={requestForm.type}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {#each typeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Hours -->
          <div>
            <label for="hours" class="mb-2 block text-sm font-medium">Hours per Day</label>
            <input
              id="hours"
              type="number"
              min="1"
              max="24"
              step="0.5"
              bind:value={requestForm.hours}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <!-- Start Date -->
          <div>
            <label for="startDate" class="mb-2 block text-sm font-medium">Start Date</label>
            <input
              id="startDate"
              type="date"
              bind:value={requestForm.startDate}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <!-- End Date -->
          <div>
            <label for="endDate" class="mb-2 block text-sm font-medium">End Date</label>
            <input
              id="endDate"
              type="date"
              bind:value={requestForm.endDate}
              min={requestForm.startDate}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <!-- Reason -->
        <div>
          <label for="reason" class="mb-2 block text-sm font-medium">Reason (Optional)</label>
          <textarea
            id="reason"
            bind:value={requestForm.reason}
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Provide additional details if needed..."
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" on:click={() => (showRequestForm = false)}>
            Cancel
          </Button>
          <Button type="submit">Submit Request</Button>
        </div>
      </form>
    </Card>
  {/if}

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else}
    <!-- Summary Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <Calendar class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Pending</p>
            <p class="text-2xl font-bold">{pendingRequests.length}</p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <Calendar class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Approved</p>
            <p class="text-2xl font-bold">{approvedRequests.length}</p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300">
            <Calendar class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Rejected</p>
            <p class="text-2xl font-bold">{rejectedRequests.length}</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- My Requests List -->
    <Card>
      <div class="border-b px-6 py-4">
        <h2 class="font-semibold">My Requests</h2>
      </div>
      <div class="divide-y">
        {#if myRequests.length === 0}
          <div class="p-6 text-center text-muted-foreground">
            <Calendar class="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>No leave requests yet</p>
            <p class="mt-1 text-sm">Click "New Request" to submit your first request</p>
          </div>
        {:else}
          {#each myRequests as request}
            <div class="flex items-center justify-between px-6 py-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{TIME_OFF_TYPE_LABELS[request.type] || request.type}</span>
                  <Badge variant={getTimeOffStatusVariant(request.status)}>
                    {TIME_OFF_STATUS_LABELS[request.status] || request.status}
                  </Badge>
                </div>
                <p class="mt-1 text-sm text-muted-foreground">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.hours}h/day)
                </p>
                {#if request.reason}
                  <p class="mt-1 text-sm text-muted-foreground italic">{request.reason}</p>
                {/if}
                {#if request.reviewedBy}
                  <p class="mt-1 text-xs text-muted-foreground">
                    Reviewed by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                    {#if request.reviewedAt}
                      on {formatDate(request.reviewedAt)}
                    {/if}
                  </p>
                {/if}
              </div>
              <div>
                {#if request.status === 'PENDING'}
                  <Button
                    variant="ghost"
                    size="sm"
                    on:click={() => cancelRequest(request.id)}
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </Card>
  {/if}
</div>
