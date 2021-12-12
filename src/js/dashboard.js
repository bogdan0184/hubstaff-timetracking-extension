function loadTimetracker () {
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
                    let issueIds = data.map(issue => issue.id.toString());
                    chrome.storage.sync.get(issueIds, function(issueTimetracker) {
                        console.log(issueTimetracker);
                        if (issueTimetracker) {
                            let listOfTimes = [];
                            for (const issue in issueTimetracker) {
                                for (const time in issueTimetracker[issue]) {
                                    listOfTimes.push({
                                        "issue": issue,
                                        "time": issueTimetracker[issue][time],
                                    });
                                }
                            }
                            listOfTimes.sort((a, b) => {
                                return Object.values(a.time)[0] - Object.values(b.time)[0];
                            })
                            
                        }
                    });
                });
        }
    });
}

loadTimetracker();