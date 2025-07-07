chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProductData') {
    const MAX_RETRIES = 10;
    const INTERVAL_MS = 300;

    let attempts = 0;

    function tryExtractSchema() {
      const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');

      for (const tag of scriptTags) {
        try {
          const json = JSON.parse(tag.textContent);

          if (json['@type'] === 'Product') {
            sendResponse({ success: true, json });
            return;
          }

          // Sometimes it's an array with a Product entry inside
          if (Array.isArray(json)) {
            const product = json.find(item => item['@type'] === 'Product');
            if (product) {
              sendResponse({ success: true, json: product });
              return;
            }
          }

          // Sometimes wrapped in "@graph"
          if (json['@graph']) {
            const product = json['@graph'].find(item => item['@type'] === 'Product');
            if (product) {
              sendResponse({ success: true, json: product });
              return;
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      // Retry until max attempts
      if (++attempts < MAX_RETRIES) {
        setTimeout(tryExtractSchema, INTERVAL_MS);
      } else {
        sendResponse({ success: false, error: 'Product schema not found' });
      }
    }

    tryExtractSchema();
    return true; // keep the response channel open
  }
});
