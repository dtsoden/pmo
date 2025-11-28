<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type TimeOffRequest } from '$lib/api/client';
  import { Card, Button, Badge, EmptyState, Modal, Select } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { Calendar, Check, X, Clock, User as UserIcon, Filter } from 'lucide-svelte';
  import { format, parseISO, differenceInDays } from 'date-fns';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let requests: TimeOffRequest[] = [];
  let loading = true;
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;
  let mounted = false;

  // Filters
  let statusFilter: 'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' = 'all';
  let typeFilter: 'all' | 'VACATION' | 'SICK' | 'PERSONAL' | 'HOLIDAY' | 'OTHER' = 'all';

  // Modal state
  let showRequestModal = false;
  let selectedRequest: TimeOffRequest | null = null;
  let actionLoading = false;

  onMount(async () => {
    await loadRequests();
    mounted = true;
  });

  async function loadRequests() {
    loading = true;
    try {
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const response = await api.capacity.timeOff.listAll(params);
      requests = response.data || [];
      totalPages = response.totalPages || 1;
      totalCount = response.total || 0;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to load leave requests');
      requests = [];
      totalPages = 1;
      totalCount = 0;
    } finally {
      loading = false;
    }
  }

  function openRequestDetails(request: TimeOffRequest) {
    selectedRequest = request;
    showRequestModal = true;
  }

  async function approveRequest(id: string) {
    actionLoading = true;
    try {
      await api.capacity.timeOff.approve(id);
      toast.success('Leave request approved');
      showRequestModal = false;
      await loadRequests();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to approve request');
    } finally {
      actionLoading = false;
    }
  }

  async function rejectRequest(id: string) {
    actionLoading = true;
    try {
      await api.capacity.timeOff.reject(id);
      toast.success('Leave request rejected');
      showRequestModal = false;
      await loadRequests();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reject request');
    } finally {
      actionLoading = false;
    }
  }


  function getStatusColor(status: string) {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'destructive';
      case 'CANCELLED': return 'secondary';
      default: return 'secondary';
    }
  }

  function getTypeLabel(type: string) {
    return type.charAt(0) + type.slice(1).toLowerCase();
  }

  function calculateDays(startDate: string, endDate: string): number {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  }

  $: {
    // Reload when filters change (but not on initial mount)
    statusFilter, typeFilter;
    if (mounted) {
      currentPage = 1;
      loadRequests();
    }
  }
</script>

<svelte:head>
  <title>Leave Requests - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold">Leave Requests</h1>
    <p class="text-sm text-muted-foreground">
      Manage team leave requests and capacity planning
    </p>
  </div>

  <!-- Filters -->
  <Card class="p-4">
    <div class="flex gap-4">
      <div class="flex-1">
        <label for="status-filter" class="mb-2 block text-sm font-medium">Status</label>
        <select
          id="status-filter"
          bind:value={statusFilter}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div class="flex-1">
        <label for="type-filter" class="mb-2 block text-sm font-medium">Type</label>
        <select
          id="type-filter"
          bind:value={typeFilter}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Types</option>
          <option value="VACATION">Vacation</option>
          <option value="SICK">Sick</option>
          <option value="PERSONAL">Personal</option>
          <option value="HOLIDAY">Holiday</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
    </div>
  </Card>

  <!-- Requests List -->
  {#if loading}
    <Card class="p-12">
      <div class="flex items-center justify-center">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    </Card>
  {:else if requests.length === 0}
    <EmptyState
      title="No leave requests"
      description={statusFilter === 'all' && typeFilter === 'all'
        ? "No leave requests have been submitted yet"
        : "No requests match your filters"}
    >
      <svelte:fragment slot="icon">
        <Calendar class="h-12 w-12" />
      </svelte:fragment>
    </EmptyState>
  {:else}
    <div class="space-y-3">
      {#each requests as request}
        <Card class="p-4 hover:bg-muted/50 cursor-pointer transition-colors" on:click={() => openRequestDetails(request)}>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4 flex-1">
              <!-- User Info -->
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserIcon class="h-5 w-5 text-primary" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium">
                    {request.user.firstName} {request.user.lastName}
                  </h3>
                  <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                  <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                </div>
                <p class="text-sm text-muted-foreground">
                  {format(parseISO(request.startDate), 'MMM d, yyyy')} - {format(parseISO(request.endDate), 'MMM d, yyyy')}
                  ({calculateDays(request.startDate, request.endDate)} day{calculateDays(request.startDate, request.endDate) !== 1 ? 's' : ''}, {request.hours} hours)
                </p>
                {#if request.reason}
                  <p class="text-sm text-muted-foreground mt-1 truncate">
                    {request.reason}
                  </p>
                {/if}
              </div>
            </div>

            <!-- Quick Actions for Pending -->
            {#if request.status === 'PENDING'}
              <div class="flex items-center gap-2" on:click|stopPropagation>
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => approveRequest(request.id)}
                  loading={actionLoading}
                >
                  <Check class="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => rejectRequest(request.id)}
                  loading={actionLoading}
                >
                  <X class="mr-1 h-4 w-4" />
                  Reject
                </Button>
              </div>
            {:else if request.status === 'APPROVED'}
              <div class="text-sm text-muted-foreground">
                Approved {request.approvedAt ? format(parseISO(request.approvedAt), 'MMM d, yyyy') : ''}
              </div>
            {/if}
          </div>
        </Card>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-center gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          on:click={() => { currentPage--; loadRequests(); }}
        >
          Previous
        </Button>
        <span class="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages} ({totalCount} total)
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          on:click={() => { currentPage++; loadRequests(); }}
        >
          Next
        </Button>
      </div>
    {/if}
  {/if}
</div>

<!-- Request Details Modal -->
<Modal bind:open={showRequestModal} title="Leave Request Details" size="md">
  {#if selectedRequest}
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UserIcon class="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">
            {selectedRequest.user.firstName} {selectedRequest.user.lastName}
          </h3>
          <p class="text-sm text-muted-foreground">{selectedRequest.user.email}</p>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label class="text-sm font-medium">Type</label>
          <p class="text-sm">{getTypeLabel(selectedRequest.type)}</p>
        </div>

        <div>
          <label class="text-sm font-medium">Dates</label>
          <p class="text-sm">
            {format(parseISO(selectedRequest.startDate), 'MMMM d, yyyy')} - {format(parseISO(selectedRequest.endDate), 'MMMM d, yyyy')}
          </p>
          <p class="text-xs text-muted-foreground">
            {calculateDays(selectedRequest.startDate, selectedRequest.endDate)} day{calculateDays(selectedRequest.startDate, selectedRequest.endDate) !== 1 ? 's' : ''}, {selectedRequest.hours} hours
          </p>
        </div>

        {#if selectedRequest.reason}
          <div>
            <label class="text-sm font-medium">Reason</label>
            <p class="text-sm">{selectedRequest.reason}</p>
          </div>
        {/if}

        <div>
          <label class="text-sm font-medium">Status</label>
          <div class="mt-1">
            <Badge variant={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
          </div>
        </div>

        {#if selectedRequest.approvedAt}
          <div>
            <label class="text-sm font-medium">Approved</label>
            <p class="text-sm">{format(parseISO(selectedRequest.approvedAt), 'MMMM d, yyyy')}</p>
          </div>
        {/if}

        <div>
          <label class="text-sm font-medium">Submitted</label>
          <p class="text-sm">{format(parseISO(selectedRequest.createdAt), 'MMMM d, yyyy')}</p>
        </div>
      </div>
    </div>
  {/if}

  <div slot="footer" class="flex justify-end gap-2">
    {#if selectedRequest?.status === 'PENDING'}
      <Button variant="outline" on:click={() => showRequestModal = false}>
        Close
      </Button>
      <Button variant="outline" on:click={() => rejectRequest(selectedRequest.id)} loading={actionLoading}>
        <X class="mr-2 h-4 w-4" />
        Reject
      </Button>
      <Button on:click={() => approveRequest(selectedRequest.id)} loading={actionLoading}>
        <Check class="mr-2 h-4 w-4" />
        Approve
      </Button>
    {:else if selectedRequest}
      <Button variant="outline" on:click={() => showRequestModal = false}>
        Close
      </Button>
    {/if}
  </div>
</Modal>

