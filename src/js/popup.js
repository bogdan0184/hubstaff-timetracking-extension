Number.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

let dashboardButton = document.getElementById('dashboard-button');
let buttonStart = document.getElementById('time-start-button');
let buttonStop = document.getElementById('time-stop-button');
let buttonPause = document.getElementById('time-pause-button');
let timeDisplay = document.getElementById('time-display');

let timer = null;

let port = chrome.runtime.connect();

dashboardButton.addEventListener('click', function () {
     chrome.tabs.create({url: chrome.runtime.getURL("src/html/dashboard.html")});
});

buttonStart.addEventListener('click', function () {
    chrome.storage.sync.get("currentIssue", function(data) {
        if (data.currentIssue) {
            
            chrome.storage.sync.set({"timerStarted": true});
            timer = runTimer();
        }
    });
    this.classList.add('timer-button-activated');
    buttonStop.classList.remove('timer-button-activated');
    buttonPause.classList.remove('timer-button-activated');
    buttonStart.disabled = true;
    buttonStop.disabled = false;
    buttonPause.disabled = false;
});

buttonStop.addEventListener('click', function () {
    this.classList.add('timer-button-activated');
    buttonStart.classList.remove('timer-button-activated');
    buttonPause.classList.remove('timer-button-activated');
    buttonStart.disabled = false;
    buttonStop.disabled = true;
    buttonPause.disabled = false;
    clearInterval(timer);
    chrome.storage.sync.set({"timerStarted": false});
    chrome.storage.sync.set({"timerPaused": false});
    chrome.storage.sync.set({"countedTime": 0});
    timeDisplay.children[0].innerText = "00:00:00";
});

buttonPause.addEventListener('click', function () {
    this.classList.add('timer-button-activated');
    buttonStop.classList.remove('timer-button-activated');
    buttonStart.classList.remove('timer-button-activated');
    buttonStart.disabled = false;
    buttonStop.disabled = false;
    buttonPause.disabled = true;
    clearInterval(timer);
    chrome.storage.sync.set({"timerStarted": false});
    chrome.storage.sync.set({"timerPaused": true});
});

function selectIssue() {
    chrome.storage.sync.get("currentIssue", function(data) {
        console.log(data);
        if (data.currentIssue) {
            let issueRow = document.getElementById(data.currentIssue + "-button");
            if (issueRow) {
                issueRow.classList.add('btn-select');
                issueRow.classList.remove('btn-selected');
                issueRow.removeAttribute("disabled");
                issueRow.innerText = "Select";
            }
        }
    });
    chrome.storage.sync.set({"currentIssue": this.id.split("-button")[0]});
    let issueRow = document.getElementById(this.id);
    issueRow.classList.add('btn-selected');
    issueRow.classList.remove('btn-select');
    issueRow.setAttribute("disabled", true);
    issueRow.innerText = "Selected";
    buttonStart.disabled = false;
    buttonStop.disabled = false;
    buttonPause.disabled = false;
}

function loadIssues() {
    chrome.storage.sync.get(['gitlabUrl', 'gitlabPAT', 'gitlabUserID'], function(data) {
        if (data.gitlabUrl && data.gitlabPAT && data.gitlabUserID) {
            let request = new Request(`${data.gitlabUrl}api/v4/issues?assignee_id=${data.gitlabUserID}`, {
                headers: {
                    'PRIVATE-TOKEN': data.gitlabPAT
                }
            });
            fetch(request)
                .then(response => response.json())
                .then(data => {
                    let issues = data.filter(issue => issue.state === 'opened');
                    let issueTable = document.getElementById('issue-table');
                    issues.forEach(issue => {
                        let issueRow = document.createElement('tr');
                        issueRow.setAttribute('id', issue.id);
                        let issueReference = document.createElement('td');
                        issueReference.innerText = issue.references.short;
                        issueRow.appendChild(issueReference);
                        let issueTitle = document.createElement('td');
                        let issueLink = document.createElement('a');
                        issueLink.href = issue.web_url;
                        issueLink.target = '_blank';
                        issueLink.innerText = issue.title;
                        issueTitle.appendChild(issueLink);
                        issueRow.appendChild(issueTitle);
                        let issueState = document.createElement('td');
                        issueState.innerText = issue.state;
                        issueRow.appendChild(issueState);
                        let issueTimeSpent = document.createElement('td');
                        issueTimeSpent.innerText = issue.time_stats.total_time_spent.toHHMMSS();
                        issueRow.appendChild(issueTimeSpent);
                        let issueSelected = document.createElement('td');
                        issueSelected.innerHTML = "<button class='btn btn-primary btn-select' id='" + issue.id + "-button'>Select</button>";
                        issueRow.appendChild(issueSelected);
                        issueTable.appendChild(issueRow);
                    });
                    chrome.storage.sync.get("currentIssue", function(data) {
                        if (data.currentIssue) {
                            let issueRow = document.getElementById(data.currentIssue + "-button");
                            console.log(issueRow);
                            if (issueRow) {
                                issueRow.classList.add('btn-selected');
                                issueRow.classList.remove('btn-select');
                                issueRow.setAttribute("disabled", true);
                                issueRow.innerText = "Selected";
                                let buttonStart = document.getElementById('time-start-button');
                                buttonStart.disabled = false;
                                let buttonStop = document.getElementById('time-stop-button');
                                buttonStop.disabled = false;
                                let buttonPause = document.getElementById('time-pause-button');
                                buttonPause.disabled = false;
                                chrome.storage.sync.get(["timerStarted", "timerPaused"], function(data) {
                                    if (data.timerStarted) {
                                        let buttonStart = document.getElementById('time-start-button');
                                        buttonStart.classList.add('timer-button-activated');
                                        buttonStart.disabled = true;
                                        chrome.storage.sync.get(["countedTime", "saveTime"], function(data) {
                                            time = data.countedTime
                                            if (data.saveTime) {
                                                time += (Date.now() - data.saveTime) / 1000;
                                            }
                                            chrome.storage.sync.set({"countedTime": time});
                                            chrome.storage.sync.set({"saveTime": 0});
                                            timeDisplay.children[0].innerText = time.toHHMMSS();
                                        });
                                        timer = runTimer();
                                    } else if (data.timerPaused) {
                                        let buttonStop = document.getElementById('time-stop-button');
                                        buttonStop.classList.add('timer-button-activated');
                                        buttonStop.disabled = true;
                                        let buttonPause = document.getElementById('time-pause-button');
                                        buttonPause.classList.add('timer-button-activated');
                                        buttonPause.disabled = true;
                                        timeDisplay.children[0].innerText = data.countedTime.toHHMMSS();
                                    }
                                });
                            }
                        }
                    });
                    let buttons = document.getElementsByClassName('btn-select');
                    for (const button of buttons) {
                        button.addEventListener('click', selectIssue);
                    }
                });
        }
    });
}

function runTimer() {
    return setInterval(function() {
        chrome.storage.sync.get("countedTime", function(data) {
            chrome.storage.sync.set({"countedTime": data.countedTime + 1});
            timeDisplay.children[0].innerText = (data.countedTime + 1).toHHMMSS();
        });
    }, 1000);
}

loadIssues();