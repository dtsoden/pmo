// Content script that listens for authentication messages from the web app
// and forwards them to the background service worker

console.log('PMO Timer Extension: Content script loaded');

// Listen for messages from the web page
window.addEventListener('message', (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) {
    return;
  }

  // Handle ping requests
  if (event.data?.type === 'PMO_EXTENSION_PING') {
    // Check if chrome.runtime is available (extension might be invalidated)
    if (!chrome?.runtime?.id) {
      // Silently ignore - this is an old/dead content script
      return;
    }

    console.log('PMO Timer Extension: Received ping, checking auth status');

    // Check if we're authenticated
    try {
      chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
        if (chrome.runtime.lastError) {
          // Silently ignore runtime errors
          return;
        }

        const isAuthenticated = response?.success && response?.data?.isAuthenticated;

        window.postMessage(
          {
            type: 'PMO_EXTENSION_READY',
            isAuthenticated,
          },
          window.location.origin
        );
      });
    } catch (error) {
      // Silently ignore errors from dead contexts
    }
    return;
  }

  // Check if this is a PMO extension auth message
  if (event.data?.type === 'PMO_EXTENSION_AUTH') {
    console.log('PMO Timer Extension: Received auth message from web app');

    const { token, apiUrl } = event.data;

    // Forward to background service worker
    chrome.runtime.sendMessage(
      {
        type: 'INIT',
        data: { token, apiUrl },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send auth to background:', chrome.runtime.lastError);

          // Notify web app of failure
          window.postMessage(
            {
              type: 'PMO_EXTENSION_AUTH_RESPONSE',
              success: false,
              error: chrome.runtime.lastError.message,
            },
            window.location.origin
          );
        } else if (response?.success) {
          console.log('PMO Timer Extension: Successfully initialized');

          // Notify web app of success
          window.postMessage(
            {
              type: 'PMO_EXTENSION_AUTH_RESPONSE',
              success: true,
            },
            window.location.origin
          );
        } else {
          console.error('Failed to initialize extension:', response?.error);

          // Notify web app of failure
          window.postMessage(
            {
              type: 'PMO_EXTENSION_AUTH_RESPONSE',
              success: false,
              error: response?.error || 'Unknown error',
            },
            window.location.origin
          );
        }
      }
    );
  }
});

// Notify web app that extension is ready
window.postMessage(
  {
    type: 'PMO_EXTENSION_READY',
  },
  window.location.origin
);

export {};
