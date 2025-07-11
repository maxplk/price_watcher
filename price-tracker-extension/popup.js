document.addEventListener('DOMContentLoaded', () => {

  async function sendGetProductData() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    // Check if URL matches your allowed domains
    const url = tab.url || '';
    const allowedHosts = ['staples.ca', 'amazon.ca', 'bestbuy.ca'];
    if (!allowedHosts.some(host => url.includes(host))) {
      throw new Error('This extension only works on Staples.ca, Amazon.ca, and BestBuy.ca product pages.');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductData' });
      return response;
    } catch (error) {
      // Catch errors if content script is not injected or no listener exists
      throw new Error('Could not communicate with content script. Make sure you are on a supported product page.');
    }
  }

  async function sendToServer(productJson) {
    try {
      const response = await fetch('http://127.0.0.1:8000/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productJson),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      return await response.json();
    } catch (e) {
      throw e;
    }
  }

  document.getElementById('saveFullPageBtn').addEventListener('click', async () => {
    try {
      const response = await sendGetProductData();

      if (response.success) {
        const json = JSON.stringify(response.json, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
          url,
          filename: `product-${Date.now()}.json`,
          saveAs: true
        });

        document.getElementById('status').textContent = '✅ Product JSON saved!';
      } else {
        document.getElementById('status').textContent = '❌ Error: ' + response.error;
      }
    } catch (e) {
      document.getElementById('status').textContent = '❌ ' + e.message;
      console.error(e);
    }
  });

  document.getElementById('viewDataBtn').addEventListener('click', async () => {
    try {
      const response = await sendGetProductData();

      if (response.success) {
        const json = JSON.stringify(response.json, null, 2);
        document.getElementById('preview').textContent = json;
        document.getElementById('status').textContent = '✅ Product data previewed';
      } else {
        document.getElementById('preview').textContent = '';
        document.getElementById('status').textContent = '❌ Error: ' + response.error;
      }
    } catch (e) {
      document.getElementById('preview').textContent = '';
      document.getElementById('status').textContent = '❌ ' + e.message;
      console.error(e);
    }
  });

  // NEW: Send to Server button handler
  document.getElementById('sendToServerBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    const previewEl = document.getElementById('preview');

    statusEl.textContent = '⏳ Sending data to server...';
    previewEl.textContent = '';

    try {
      const response = await sendGetProductData();

      if (!response.success) {
        statusEl.textContent = '❌ Error: ' + response.error;
        return;
      }

      const serverResponse = await sendToServer(response.json);

      if (serverResponse.extracted) {
        previewEl.textContent = JSON.stringify(serverResponse.extracted, null, 2);
        statusEl.textContent = '✅ Server returned product name and price';
      } else if (serverResponse.error) {
        statusEl.textContent = '❌ Server error: ' + serverResponse.error;
      } else {
        statusEl.textContent = '❌ Unexpected server response';
      }
    } catch (e) {
      statusEl.textContent = '❌ ' + e.message;
      console.error(e);
    }
  });

});
