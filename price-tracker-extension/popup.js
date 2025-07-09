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

});
