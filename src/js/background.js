chrome.runtime.onConnect.addListener(function (externalPort) {
    externalPort.onDisconnect.addListener(function() {
        chrome.storage.sync.get("timerStarted", function (data) {
            if (data.timerStarted) {
                chrome.storage.sync.set({
                    saveTime: Date.now()
                });
            }
        });
    });
});