import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { auth, hasRole } from '$lib/stores/auth';
import { goto } from '$app/navigation';

export async function load() {
  // Only run in browser (client-side)
  if (browser) {
    // Check if user has required role (RESOURCE_MANAGER or higher)
    // This page is for managing all team members' time-off requests
    if (!hasRole('RESOURCE_MANAGER')) {
      // Redirect to dashboard if unauthorized
      await goto('/dashboard');
      return {};
    }
  }

  return {};
}
