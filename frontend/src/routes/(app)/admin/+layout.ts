import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { auth, hasAnyRole } from '$lib/stores/auth';
import { goto } from '$app/navigation';

export async function load() {
  // Only run in browser (client-side)
  if (browser) {
    // Check if user has system admin role (ADMIN or SUPER_ADMIN only)
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      // Redirect to dashboard if unauthorized
      await goto('/dashboard');
      return {};
    }
  }

  return {};
}
