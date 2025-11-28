<script lang="ts">
  import { page } from '$app/stores';
  import { user, hasRole, hasAnyRole } from '$lib/stores/auth';
  import { cn } from '$lib/utils';
  import {
    LayoutDashboard,
    FolderKanban,
    Building2,
    Users,
    UsersRound,
    Clock,
    Calendar,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    Shield,
    ScrollText,
    Sliders,
    MonitorDot,
    UserCog,
    ListOrdered,
    CalendarCheck,
  } from 'lucide-svelte';

  export let collapsed = false;

  interface NavItem {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    minRole?: string;
  }

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/clients', label: 'Clients', icon: Building2, minRole: 'PROJECT_MANAGER' },
    { href: '/teams', label: 'Teams', icon: UsersRound, minRole: 'RESOURCE_MANAGER' },
    { href: '/people', label: 'People', icon: Users, minRole: 'RESOURCE_MANAGER' },
    { href: '/time', label: 'Time Tracking', icon: Clock },
    { href: '/capacity', label: 'Capacity', icon: Calendar, minRole: 'RESOURCE_MANAGER' },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, minRole: 'PMO_MANAGER' },
  ];

  const adminItems: NavItem[] = [
    { href: '/admin', label: 'Admin Dashboard', icon: Shield },
    { href: '/admin/users', label: 'User Management', icon: UserCog },
    { href: '/capacity/time-off', label: 'Leave Requests', icon: CalendarCheck, minRole: 'RESOURCE_MANAGER' },
    { href: '/admin/dropdowns', label: 'Dropdown Lists', icon: ListOrdered },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { href: '/admin/sessions', label: 'Sessions', icon: MonitorDot },
    { href: '/admin/settings', label: 'Platform Settings', icon: Sliders },
  ];

  const bottomItems: NavItem[] = [
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  $: isAdmin = hasAnyRole('ADMIN', 'SUPER_ADMIN');

  // Compute active state directly in the template using reactive page store
  function isActive(href: string, pathname: string): boolean {
    // Admin routes are all siblings, use exact matching only
    if (href.startsWith('/admin')) {
      return pathname === href;
    }

    // Main nav items can have child routes
    return pathname === href || pathname.startsWith(href + '/');
  }

  function canAccess(item: NavItem): boolean {
    if (!item.minRole) return true;
    return hasRole(item.minRole as 'SUPER_ADMIN' | 'ADMIN' | 'PMO_MANAGER' | 'PROJECT_MANAGER' | 'RESOURCE_MANAGER' | 'TEAM_MEMBER' | 'VIEWER');
  }
</script>

<aside
  class={cn(
    'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300',
    collapsed ? 'w-16' : 'w-64'
  )}
>
  <!-- Logo -->
  <div class="flex h-16 items-center justify-between border-b px-4">
    {#if !collapsed}
      <a href="/dashboard" class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span class="text-lg font-bold">P</span>
        </div>
        <span class="text-lg font-semibold">PMO</span>
      </a>
    {:else}
      <a href="/dashboard" class="mx-auto">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span class="text-lg font-bold">P</span>
        </div>
      </a>
    {/if}
  </div>

  <!-- Main Navigation -->
  <nav class="flex-1 space-y-1 overflow-y-auto p-2">
    {#each navItems as item}
      {#if canAccess(item)}
        <a
          href={item.href}
          class={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.href, $page?.url?.pathname ?? '')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? item.label : undefined}
        >
          <svelte:component this={item.icon} class="h-5 w-5 shrink-0" />
          {#if !collapsed}
            <span>{item.label}</span>
          {/if}
        </a>
      {/if}
    {/each}

    <!-- Admin Section -->
    {#if isAdmin}
      <div class="my-4 border-t pt-4">
        {#if !collapsed}
          <p class="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
            Administration
          </p>
        {/if}
        {#each adminItems as item}
          <a
            href={item.href}
            class={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(item.href, $page?.url?.pathname ?? '')
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? item.label : undefined}
          >
            <svelte:component this={item.icon} class="h-5 w-5 shrink-0" />
            {#if !collapsed}
              <span>{item.label}</span>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </nav>

  <!-- Bottom Navigation -->
  <div class="border-t p-2">
    {#each bottomItems as item}
      {#if canAccess(item)}
        <a
          href={item.href}
          class={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.href, $page?.url?.pathname ?? '')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? item.label : undefined}
        >
          <svelte:component this={item.icon} class="h-5 w-5 shrink-0" />
          {#if !collapsed}
            <span>{item.label}</span>
          {/if}
        </a>
      {/if}
    {/each}

    <!-- Collapse Toggle -->
    <button
      type="button"
      class={cn(
        'mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
      on:click={() => (collapsed = !collapsed)}
    >
      {#if collapsed}
        <ChevronRight class="h-5 w-5" />
      {:else}
        <ChevronLeft class="h-5 w-5" />
        <span>Collapse</span>
      {/if}
    </button>
  </div>
</aside>
