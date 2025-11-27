<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type AuditLog, type AuditSeverity, type AuditStatus } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Card, CardContent, CardHeader, CardTitle } from '$components/ui/card';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Spinner } from '$components/shared';
  import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Info,
    AlertTriangle,
    XCircle,
  } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let logs: AuditLog[] = [];
  let loading = true;
  let error: string | null = null;
  let page = 1;
  let totalPages = 1;
  let total = 0;

  // Filters
  let actionFilter = '';
  let severityFilter: AuditSeverity | '' = '';
  let statusFilter: AuditStatus | '' = '';
  let searchTerm = '';

  onMount(async () => {
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }

    await loadLogs();
  });

  async function loadLogs() {
    loading = true;
    error = null;
    try {
      const params: Record<string, unknown> = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.admin.auditLogs.list(params);
      logs = response.logs;
      totalPages = response.pagination.totalPages;
      total = response.pagination.total;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load audit logs';
    } finally {
      loading = false;
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case 'CRITICAL': return XCircle;
      case 'ERROR': return AlertCircle;
      case 'WARNING': return AlertTriangle;
      default: return Info;
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'ERROR': return 'text-orange-600 bg-orange-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  function formatAction(action: string): string {
    return action.replace(/_/g, ' ');
  }

  $: filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.entityType?.toLowerCase().includes(search) ||
      log.user?.email.toLowerCase().includes(search) ||
      log.ipAddress?.toLowerCase().includes(search)
    );
  });

  async function goToPage(newPage: number) {
    page = newPage;
    await loadLogs();
  }

  async function applyFilters() {
    page = 1;
    await loadLogs();
  }

  async function clearFilters() {
    actionFilter = '';
    severityFilter = '';
    statusFilter = '';
    searchTerm = '';
    page = 1;
    await loadLogs();
  }
</script>

<svelte:head>
  <title>Audit Logs - Admin - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Audit Logs</h1>
      <p class="text-muted-foreground">Track all system activity and security events</p>
    </div>
    <Badge variant="secondary">{total} total entries</Badge>
  </div>

  <!-- Filters -->
  <Card>
    <CardContent class="pt-6">
      <div class="grid gap-4 md:grid-cols-5">
        <div class="relative md:col-span-2">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search logs..."
            class="pl-10"
            bind:value={searchTerm}
          />
        </div>

        <select
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          bind:value={severityFilter}
          on:change={applyFilters}
        >
          <option value="">All Severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          bind:value={statusFilter}
          on:change={applyFilters}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>

        <Button variant="outline" on:click={clearFilters}>
          Clear Filters
        </Button>
      </div>
    </CardContent>
  </Card>

  {#if loading}
    <div class="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card>
      <CardContent class="py-8">
        <div class="text-center text-destructive">
          <AlertCircle class="mx-auto mb-2 h-8 w-8" />
          <p>{error}</p>
        </div>
      </CardContent>
    </Card>
  {:else}
    <Card>
      <CardContent class="p-0">
        <div class="divide-y">
          {#each filteredLogs as log}
            <div class="p-4 hover:bg-muted/50">
              <div class="flex items-start gap-4">
                <div class={`mt-0.5 rounded-full p-1.5 ${getSeverityColor(log.severity)}`}>
                  <svelte:component this={getSeverityIcon(log.severity)} class="h-4 w-4" />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium">{formatAction(log.action)}</span>
                    {#if log.entityType}
                      <Badge variant="outline" class="text-xs">
                        {log.entityType}
                      </Badge>
                    {/if}
                    <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'} class="text-xs">
                      {log.status}
                    </Badge>
                  </div>

                  <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})`
                        : 'System'}
                    </span>
                    {#if log.ipAddress}
                      <span>IP: {log.ipAddress}</span>
                    {/if}
                    <span>{formatDate(log.createdAt)}</span>
                  </div>

                  {#if log.errorDetail}
                    <p class="mt-2 text-sm text-destructive">{log.errorDetail}</p>
                  {/if}

                  {#if log.metadata && Object.keys(log.metadata).length > 0}
                    <details class="mt-2">
                      <summary class="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                        View details
                      </summary>
                      <pre class="mt-2 rounded bg-muted p-2 text-xs overflow-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                    </details>
                  {/if}
                </div>
              </div>
            </div>
          {:else}
            <div class="p-8 text-center text-muted-foreground">
              No audit logs found
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            on:click={() => goToPage(page - 1)}
          >
            <ChevronLeft class="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            on:click={() => goToPage(page + 1)}
          >
            Next
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
