<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { auth } from '$lib/stores/auth';

  // Session timeout settings (must match backend)
  const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const WARNING_BEFORE_MS = 1 * 60 * 1000;  // Show warning 1 minute before
  const WARNING_AT_MS = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS; // 4 minutes

  let showWarning = false;
  let secondsRemaining = 60;
  let activityTimer: ReturnType<typeof setTimeout> | null = null;
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  function resetTimers() {
    // Clear existing timers
    if (activityTimer) clearTimeout(activityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    showWarning = false;
    secondsRemaining = 60;

    // Set warning timer (fires at 4 minutes of inactivity)
    warningTimer = setTimeout(() => {
      showWarning = true;
      secondsRemaining = 60;

      // Start countdown
      countdownInterval = setInterval(() => {
        secondsRemaining--;
        if (secondsRemaining <= 0) {
          handleTimeout();
        }
      }, 1000);
    }, WARNING_AT_MS);

    // Set logout timer (fires at 5 minutes of inactivity)
    activityTimer = setTimeout(() => {
      handleTimeout();
    }, SESSION_TIMEOUT_MS);
  }

  function handleTimeout() {
    // Clear all timers
    if (activityTimer) clearTimeout(activityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    // Logout the user
    auth.logout();

    if (browser) {
      window.location.href = '/login?reason=inactivity';
    }
  }

  function handleActivity() {
    // Only reset if warning is not showing, or if user explicitly interacts
    if (browser) {
      resetTimers();
    }
  }

  function stayLoggedIn() {
    // User clicked "Stay Logged In" - reset everything
    resetTimers();
  }

  onMount(() => {
    if (!browser) return;

    // Initial timer setup
    resetTimers();

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttle activity detection to avoid excessive timer resets
    let lastActivity = Date.now();
    const throttleMs = 1000; // Only register activity once per second

    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastActivity > throttleMs) {
        lastActivity = now;
        // Don't reset if warning is showing (user must click button)
        if (!showWarning) {
          handleActivity();
        }
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler);
      });
    };
  });

  onDestroy(() => {
    if (activityTimer) clearTimeout(activityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    if (countdownInterval) clearInterval(countdownInterval);
  });
</script>

{#if showWarning}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Session Timeout Warning</h3>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        You will be logged out due to inactivity in <span class="font-bold text-red-600 dark:text-red-400">{secondsRemaining}</span> seconds.
      </p>

      <div class="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-full bg-amber-500 transition-all duration-1000"
          style="width: {(secondsRemaining / 60) * 100}%"
        ></div>
      </div>

      <div class="flex gap-3">
        <button
          on:click={stayLoggedIn}
          class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Stay Logged In
        </button>
        <button
          on:click={handleTimeout}
          class="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Log Out Now
        </button>
      </div>
    </div>
  </div>
{/if}
