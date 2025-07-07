console.log('Price Watcher background loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Price Watcher installed');
});
