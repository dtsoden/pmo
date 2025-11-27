<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type AdminDashboardStats, type SystemHealth } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Card, CardContent, CardHeader, CardTitle } from '$components/ui/card';
  import { Badge } from '$components/ui/badge';
  import { Spinner } from '$components/shared';
  import {
    Users,
    UserCheck,
    UserX,
    AlertCircle,
    Activity,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
  } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let stats: AdminDashboardStats | null = null;
  let health: SystemHealth | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    // Check admin access
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }

    try {
      [stats, health] = await Promise.all([
        api.admin.dashboard(),
        api.admin.health(),
      ]);
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'ERROR': return 'bg-orange-500';
      case 'WARNING': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  }
</script>

<svelte:head>
  <title>Admin Dashboard - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Admin Dashboard</h1>
      <p class="text-muted-foreground">System overview and administration</p>
    </div>
    {#if health}
      <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'} class="text-sm">
        {#if health.status === 'healthy'}
          <CheckCircle class="mr-1 h-4 w-4" />
        {:else}
          <AlertCircle class="mr-1 h-4 w-4" />
        {/if}
        System {health.status}
      </Badge>
    {/if}
  </div>

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
  {:else if stats}
    <!-- User Stats -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Users</CardTitle>
          <Users class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.users.total}</div>
          <p class="text-xs text-muted-foreground">
            +{stats.users.newThisWeek} new this week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Users</CardTitle>
          <UserCheck class="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.users.active}</div>
          <p class="text-xs text-muted-foreground">
            {stats.users.inactive} inactive, {stats.users.suspended} suspended
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Sessions</CardTitle>
          <Activity class="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.sessions.active}</div>
          <p class="text-xs text-muted-foreground">
            Currently logged in
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Login Success Rate</CardTitle>
          <Shield class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {stats.logins.total > 0
              ? Math.round((stats.logins.successful / stats.logins.total) * 100)
              : 100}%
          </div>
          <p class="text-xs text-muted-foreground">
            {stats.logins.failed} failed attempts (24h)
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Users by Role -->
      <Card>
        <CardHeader>
          <CardTitle>Users by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            {#each stats.users.byRole as roleData}
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{roleData.role.replace('_', ' ')}</span>
                <Badge variant="secondary">{roleData.count}</Badge>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>

      <!-- System Health -->
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          {#if health}
            <div class="space-y-3">
              {#each Object.entries(health.checks) as [name, check]}
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium capitalize">{name}</span>
                  <div class="flex items-center gap-2">
                    {#if check.status === 'ok'}
                      <CheckCircle class="h-4 w-4 text-green-500" />
                    {:else}
                      <XCircle class="h-4 w-4 text-red-500" />
                    {/if}
                    {#if check.message}
                      <span class="text-xs text-muted-foreground">{check.message}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
            <p class="mt-4 text-xs text-muted-foreground">
              Last checked: {formatDate(health.timestamp)}
            </p>
          {/if}
        </CardContent>
      </Card>

      <!-- Recent Activity -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Activity (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {#if stats.recentActivity.length === 0}
            <p class="text-center text-muted-foreground py-4">No recent activity</p>
          {:else}
            <div class="space-y-3">
              {#each stats.recentActivity.slice(0, 10) as activity}
                <div class="flex items-center gap-4 rounded-lg border p-3">
                  <div class={`h-2 w-2 rounded-full ${getSeverityColor(activity.severity)}`}></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{activity.action}</p>
                    <p class="text-xs text-muted-foreground">
                      {activity.user
                        ? `${activity.user.firstName} ${activity.user.lastName}`
                        : 'System'}
                      {#if activity.entityType}
                        &bull; {activity.entityType}
                      {/if}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <Badge variant={activity.status === 'SUCCESS' ? 'default' : 'destructive'} class="text-xs">
                      {activity.status}
                    </Badge>
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
            <div class="mt-4 text-center">
              <a href="/admin/audit-logs" class="text-sm text-primary hover:underline">
                View all audit logs
              </a>
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Login Attempts Overview -->
      <Card>
        <CardHeader>
          <CardTitle>Login Statistics (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm">Total Attempts</span>
              <span class="font-medium">{stats.logins.total}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-green-600">Successful</span>
              <span class="font-medium text-green-600">{stats.logins.successful}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-red-600">Failed</span>
              <span class="font-medium text-red-600">{stats.logins.failed}</span>
            </div>
            {#if stats.logins.topFailedEmails.length > 0}
              <div class="border-t pt-4">
                <p class="text-sm font-medium mb-2">Top Failed Accounts</p>
                {#each stats.logins.topFailedEmails.slice(0, 3) as failed}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground truncate">{failed.email}</span>
                    <Badge variant="destructive">{failed.count}</Badge>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </CardContent>
      </Card>

      <!-- Audit Stats -->
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Statistics (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm">Total Events</span>
              <span class="font-medium">{stats.audit.total}</span>
            </div>
            {#if stats.audit.bySeverity.length > 0}
              <div class="border-t pt-4">
                <p class="text-sm font-medium mb-2">By Severity</p>
                {#each stats.audit.bySeverity as sev}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">{sev.severity}</span>
                    <Badge variant="secondary">{sev.count}</Badge>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}
</div>
