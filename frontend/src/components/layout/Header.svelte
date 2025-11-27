<script lang="ts">
  import { browser } from '$app/environment';
  import { user, auth } from '$lib/stores/auth';
  import { notifications, hasUnread } from '$lib/stores/notifications';
  import { cn, fullName, ROLE_LABELS } from '$lib/utils';
  import { Avatar, Button } from '$components/shared';
  import { Bell, LogOut, User, ChevronDown } from 'lucide-svelte';
  import { onMount } from 'svelte';

  export let sidebarCollapsed = false;

  let showUserMenu = false;
  let showNotifications = false;

  onMount(() => {
    if ($user) {
      notifications.load();
    }
  });

  function handleLogout() {
    auth.logout();
    if (browser) {
      window.location.href = '/login';
    }
  }

  function closeMenus() {
    showUserMenu = false;
    showNotifications = false;
  }
</script>

<svelte:window on:click={closeMenus} />

<header
  class={cn(
    'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6 transition-all duration-300',
    sidebarCollapsed ? 'left-16' : 'left-64'
  )}
>
  <div>
    <!-- Page title or breadcrumb can go here -->
  </div>

  <div class="flex items-center gap-4">
    <!-- Notifications -->
    <div class="relative">
      <button
        type="button"
        class="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        on:click|stopPropagation={() => {
          showNotifications = !showNotifications;
          showUserMenu = false;
        }}
      >
        <Bell class="h-5 w-5" />
        {#if $hasUnread}
          <span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        {/if}
      </button>

      {#if showNotifications}
        <div
          class="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg"
          on:click|stopPropagation
        >
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h3 class="font-semibold">Notifications</h3>
            {#if $hasUnread}
              <button
                type="button"
                class="text-xs text-primary hover:underline"
                on:click={() => notifications.markAllRead()}
              >
                Mark all read
              </button>
            {/if}
          </div>
          <div class="max-h-96 overflow-y-auto">
            {#if !$notifications.notifications || $notifications.notifications.length === 0}
              <p class="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </p>
            {:else}
              {#each ($notifications.notifications || []).slice(0, 5) as notification}
                <div
                  class={cn(
                    'border-b p-4 last:border-0',
                    !notification.isRead && 'bg-muted/50'
                  )}
                >
                  <p class="text-sm font-medium">{notification.title}</p>
                  <p class="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                </div>
              {/each}
            {/if}
          </div>
          <a
            href="/settings/notifications"
            class="block border-t p-3 text-center text-sm text-primary hover:bg-muted"
          >
            View all notifications
          </a>
        </div>
      {/if}
    </div>

    <!-- User Menu -->
    <div class="relative">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg p-2 hover:bg-muted"
        on:click|stopPropagation={() => {
          showUserMenu = !showUserMenu;
          showNotifications = false;
        }}
      >
        <Avatar
          firstName={$user?.firstName}
          lastName={$user?.lastName}
          src={$user?.avatarUrl}
          size="sm"
        />
        <div class="hidden text-left md:block">
          <p class="text-sm font-medium">{fullName($user?.firstName, $user?.lastName)}</p>
          <p class="text-xs text-muted-foreground">{ROLE_LABELS[$user?.role || ''] || $user?.role}</p>
        </div>
        <ChevronDown class="hidden h-4 w-4 text-muted-foreground md:block" />
      </button>

      {#if showUserMenu}
        <div
          class="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-card shadow-lg"
          on:click|stopPropagation
        >
          <div class="border-b p-4">
            <p class="font-medium">{fullName($user?.firstName, $user?.lastName)}</p>
            <p class="text-sm text-muted-foreground">{$user?.email}</p>
          </div>
          <div class="p-2">
            <a
              href="/settings/profile"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <User class="h-4 w-4" />
              Profile Settings
            </a>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted"
              on:click={handleLogout}
            >
              <LogOut class="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</header>
