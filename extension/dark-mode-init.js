// Apply dark mode immediately to prevent flash
// This script must run before the page renders
(function() {
  const areas = [];
  if (chrome.storage?.sync) areas.push(chrome.storage.sync);
  if (chrome.storage?.local) areas.push(chrome.storage.local);
  if (areas.length) {
    areas[0].get(['darkMode'], function(data) {
      if (data.darkMode === true) {
        document.documentElement.classList.add('dark-mode');
      }
    });
  }
})();

