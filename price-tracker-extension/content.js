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
            patchPrice(json);
            sendResponse({ success: true, json });
            return;
          }

          if (Array.isArray(json)) {
            const product = json.find(item => item['@type'] === 'Product');
            if (product) {
              patchPrice(product);
              sendResponse({ success: true, json: product });
              return;
            }
          }

          if (json['@graph']) {
            const product = json['@graph'].find(item => item['@type'] === 'Product');
            if (product) {
              patchPrice(product);
              sendResponse({ success: true, json: product });
              return;
            }
          }
        } catch (e) {
          // ignore JSON parse errors
        }
      }

      // AMAZON FALLBACK: scrape title and price from known DOM elements
      if (window.location.hostname.includes('amazon.')) {
        const titleEl = document.getElementById('productTitle');
        const priceEl = document.querySelector(
          '#priceblock_ourprice, #priceblock_dealprice, #tp_price_block_total_price_ww, .a-price .a-offscreen'
        );

        if (titleEl && priceEl) {
          const title = titleEl.textContent.trim();
          const priceMatch = priceEl.textContent.match(/\$\d+(?:\.\d{2})?/);
          const priceNum = priceMatch ? parseFloat(priceMatch[0].replace(/[^0-9.]/g, '')) : null;

          if (priceNum) {
            const product = {
              '@context': 'http://schema.org/',
              '@type': 'Product',
              name: title,
              offers: {
                '@type': 'Offer',
                priceCurrency: 'CAD',
                price: priceNum,
              },
            };
            sendResponse({ success: true, json: product });
            return;
          }
        }
      }

      if (++attempts < MAX_RETRIES) {
        setTimeout(tryExtractSchema, INTERVAL_MS);
      } else {
        sendResponse({ success: false, error: 'Product schema not found' });
      }
    }

    function patchPrice(json) {
      const priceSelectors = [
        // BestBuy.ca selectors
        '.priceContainer_1fy5J',
        '.productPricingContainer_3gTS3',
        '.priceView-customer-price > span',
        '.priceView-hero-price > span',
        '[data-testid="priceblock"]',
        'div[data-automation="price"] > span',
        '.pricing-price > span',

        // Amazon.ca selectors
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#tp_price_block_total_price_ww',
        '.a-price .a-offscreen',
      ];

      let priceText = null;
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) { // check visible
          const match = el.textContent.match(/\$\d+(?:\.\d{2})?/);
          if (match) {
            priceText = match[0];
            break;
          }
        }
      }

      if (priceText) {
        const priceNum = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        if (!isNaN(priceNum) && json.offers) {
          if (json.offers['@type'] === 'AggregateOffer' && (!json.offers.lowPrice || json.offers.lowPrice === 0)) {
            json.offers.lowPrice = priceNum;
            json.offers.highPrice = priceNum;
          } else if (json.offers['@type'] === 'Offer' && (!json.offers.price || json.offers.price === 0)) {
            json.offers.price = priceNum;
          }
        }
      }
    }

    tryExtractSchema();
    return true; // keep the message channel open for async response
  }
});
