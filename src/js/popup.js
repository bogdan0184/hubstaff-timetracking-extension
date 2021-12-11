let dashboardButton = document.getElementById('dashboard-button');

dashboardButton.addEventListener('click', function () {
     chrome.tabs.create({url: chrome.runtime.getURL("src/html/index.html")});
});