// Content script that listens for authentication messages from the web app
// and forwards them to the background service worker

// Check if extension context is valid before doing anything
const isExtensionValid = () => {
  try {
    return !!chrome?.runtime?.id;
  } catch {
    return false;
  }
};

// Listen for messages from the web page
window.addEventListener('message', (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) {
    return;
  }

  // Check if extension is still valid
  if (!isExtensionValid()) {
    return;
  }

  // Handle ping requests
  if (event.data?.type === 'PMO_EXTENSION_PING') {
    try {
      chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
        if (chrome.runtime.lastError) {
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
      // Silently ignore
    }
    return;
  }

  // Check if this is a PMO extension auth message
  if (event.data?.type === 'PMO_EXTENSION_AUTH') {
    const { token, apiUrl } = event.data;

    try {
      // Forward to background service worker
      chrome.runtime.sendMessage(
        {
          type: 'INIT',
          data: { token, apiUrl },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage(
              {
                type: 'PMO_EXTENSION_AUTH_RESPONSE',
                success: false,
                error: chrome.runtime.lastError.message,
              },
              window.location.origin
            );
          } else if (response?.success) {
            window.postMessage(
              {
                type: 'PMO_EXTENSION_AUTH_RESPONSE',
                success: true,
              },
              window.location.origin
            );
          } else {
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
    } catch (error) {
      // Silently ignore
    }
  }
});

// Only notify web app if extension is valid
if (isExtensionValid()) {
  try {
    window.postMessage(
      {
        type: 'PMO_EXTENSION_READY',
      },
      window.location.origin
    );
  } catch (error) {
    // Silently ignore
  }
}

export {};
