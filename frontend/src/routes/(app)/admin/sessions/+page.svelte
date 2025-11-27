<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type UserSession } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Card, CardContent, CardHeader, CardTitle } from '$components/ui/card';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Spinner } from '$components/shared';
  import {
    Search,
    Monitor,
    Smartphone,
    Globe,
    Clock,
    X,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
  } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let sessions: UserSession[] = [];
  let loading = true;
  let error: string | null = null;
  let page = 1;
  let totalPages = 1;
  let total = 0;
  let searchTerm = '';
  let terminatingId: string | null = null;

  onMount(async () => {
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }

    await loadSessions();
  });

  async function loadSessions() {
    loading = true;
    error = null;
    try {
      const response = await api.admin.sessions.list({ page, limit: 50 });
      sessions = response.sessions;
      totalPages = response.pagination.totalPages;
      total = response.pagination.total;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load sessions';
    } finally {
      loading = false;
    }
  }

  async function terminateSession(sessionId: string) {
    terminatingId = sessionId;
    try {
      await api.admin.sessions.terminate(sessionId);
      toast.success('Session terminated');
      await loadSessions();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to terminate session');
    } finally {
      terminatingId = null;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  function getDeviceIcon(userAgent: string | null) {
    if (!userAgent) return Globe;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  }

  function parseUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown device';
    // Simple parsing - could be enhanced
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other browser';
  }

  $: filteredSessions = sessions.filter(session => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      session.user?.email.toLowerCase().includes(search) ||
      session.user?.firstName.toLowerCase().includes(search) ||
      session.user?.lastName.toLowerCase().includes(search) ||
      session.ipAddress?.toLowerCase().includes(search)
    );
  });

  async function goToPage(newPage: number) {
    page = newPage;
    await loadSessions();
  }
</script>

<svelte:head>
  <title>Active Sessions - Admin - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Active Sessions</h1>
      <p class="text-muted-foreground">Monitor and manage user sessions</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="secondary">{total} active sessions</Badge>
      <Button variant="outline" size="sm" on:click={loadSessions}>
        <RefreshCw class="h-4 w-4 mr-1" />
        Refresh
      </Button>
    </div>
  </div>

  <!-- Search -->
  <Card>
    <CardContent class="pt-6">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by user or IP address..."
          class="pl-10"
          bind:value={searchTerm}
        />
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
          {#each filteredSessions as session}
            <div class="flex items-center justify-between p-4 hover:bg-muted/50">
              <div class="flex items-center gap-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <svelte:component this={getDeviceIcon(session.userAgent)} class="h-5 w-5 text-muted-foreground" />
                </div>

                <div>
                  {#if session.user}
                    <p class="font-medium">
                      {session.user.firstName} {session.user.lastName}
                    </p>
                    <p class="text-sm text-muted-foreground">{session.user.email}</p>
                  {:else}
                    <p class="font-medium text-muted-foreground">Unknown User</p>
                  {/if}
                </div>
              </div>

              <div class="flex items-center gap-6">
                <div class="text-sm text-right">
                  <p class="text-muted-foreground">
                    {parseUserAgent(session.userAgent)}
                  </p>
                  {#if session.ipAddress}
                    <p class="text-xs text-muted-foreground">{session.ipAddress}</p>
                  {/if}
                </div>

                <div class="text-sm text-right">
                  <p class="flex items-center gap-1 text-muted-foreground">
                    <Clock class="h-3 w-3" />
                    {formatRelativeTime(session.lastActive)}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    Expires: {formatDate(session.expiresAt)}
                  </p>
                </div>

                {#if session.user}
                  <Badge variant="secondary" class="text-xs">
                    {session.user.role.replace('_', ' ')}
                  </Badge>
                {/if}

                <Button
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:text-destructive"
                  disabled={terminatingId === session.id}
                  on:click={() => terminateSession(session.id)}
                >
                  {#if terminatingId === session.id}
                    <Spinner size="sm" />
                  {:else}
                    <X class="h-4 w-4" />
                  {/if}
                </Button>
              </div>
            </div>
          {:else}
            <div class="p-8 text-center text-muted-foreground">
              No active sessions found
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
