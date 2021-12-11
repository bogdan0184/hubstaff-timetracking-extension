let dashboardButton = document.getElementById('dashboard-button');

dashboardButton.addEventListener('click', function () {
     chrome.tabs.create({url: chrome.runtime.getURL("src/html/dashboard.html")});
});

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
                    console.log(issues);
                    let issueTable = document.getElementById('issue-table');
                    issues.forEach(issue => {
                        let issueRow = document.createElement('tr');
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
                        issueTimeSpent.innerText = issue.time_stats.total_time_spent;
                        issueRow.appendChild(issueTimeSpent);
                        let issueSelected = document.createElement('td');
                        issueSelected.innerText = "SELECTED";
                        issueRow.appendChild(issueSelected);
                        issueTable.appendChild(issueRow);
                    });
                });
        }
    });
}

loadIssues();