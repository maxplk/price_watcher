document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveFullPageBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductData' });

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
      console.error(response.error);
      document.getElementById('status').textContent = '❌ Error: ' + response.error;
    }
  });

  document.getElementById('viewDataBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductData' });

    if (response.success) {
      const json = JSON.stringify(response.json, null, 2);
      document.getElementById('preview').textContent = json;
      document.getElementById('status').textContent = '✅ Product data previewed';
    } else {
      console.error(response.error);
      document.getElementById('preview').textContent = '';
      document.getElementById('status').textContent = '❌ Error: ' + response.error;
    }
  });
});
