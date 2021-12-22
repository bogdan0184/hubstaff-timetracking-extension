Number.prototype.toHHMMSS = function () {
  var sec_num = parseInt(this, 10); // don't forget the second param
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
};

var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

function getFormatedTime(t) {
  const hours = ("0" + t.getHours()).slice(-2);
  const minutes = ("0" + t.getMinutes()).slice(-2);
  const seconds = ("0" + t.getSeconds()).slice(-2);
  return `${hours}:${minutes}:${seconds}`;
}

function formatTimespan(timespan) {
  let formatedTimespan = "";
  for (const t of timespan) {
    if (t.hasOwnProperty("left")) {
      formatedTimespan += `${getFormatedTime(new Date(t.left))} - `;
    } else if (t.hasOwnProperty("right")) {
      formatedTimespan += `${getFormatedTime(new Date(t.right))}</br>`;
    }
  }
  return formatedTimespan;
}

function getTechnicalDuration(timespan) {
  let duration = 0;
  let left = 0;
  let right = 0;
  for (const t of timespan) {
    if (t.hasOwnProperty("left")) {
      left = t.left;
    } else if (t.hasOwnProperty("right")) {
      right = t.right;
    }
    if (left && right) {
      duration += right - left;
      right = 0;
      left = 0;
    }
  }
  return duration;
}

function getDuration(timespan) {
  return (getTechnicalDuration(timespan) / 1000).toHHMMSS();
}

function getHumanDuration(timespan) {
  let durationInSeconds = getTechnicalDuration(timespan) / 1000;
  let hours = Math.floor(durationInSeconds / 3600);
  let minutes = Math.floor((durationInSeconds - hours * 3600) / 60);
  let seconds = durationInSeconds - hours * 3600 - minutes * 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function replaceAllNotCSSCharacters(date) {
  let dateFormatted = date;
  let characters = ["~", "!", "@", "$", "%", "^", "&", "*", "(", ")", "+", "=", ",", ".", "/", "'", ";", ":", "\"", "?", ">", "<", "[", "]", "\\", "{", "}", "|", "`", "#", " "];
  for (const c of characters) {
    dateFormatted = dateFormatted.replaceAll(c, "x");
  }
  return dateFormatted;
}

function loadTimetracker() {
  chrome.storage.sync.get(
    ["gitlabUrl", "gitlabPAT", "gitlabUserID", "dashboardDayAmountEnabled", "dashboardDayAmount"],
    function (data) {
      if (data.gitlabUrl && data.gitlabPAT && data.gitlabUserID) {
        let request = new Request(
          `${data.gitlabUrl}api/v4/issues?assignee_id=${data.gitlabUserID}&private_token=${data.gitlabPAT}&scope=all&state=opened`,
          {
            headers: {
              "PRIVATE-TOKEN": data.gitlabPAT,
            },
          }
        );
        fetch(request)
          .then((response) => response.json())
          .then((datas) => {
            let issueIds = datas.map((issue) => issue.id.toString());
            chrome.storage.sync.get(issueIds, function (issueTimetracker) {
              if (issueTimetracker) {
                let listOfTimes = [];
                for (const issue in issueTimetracker) {
                  for (const time in issueTimetracker[issue]) {
                    listOfTimes.push({
                      issue: issue,
                      time: issueTimetracker[issue][time],
                    });
                  }
                }
                listOfTimes.forEach((time, index) => {
                  listOfTimes[index].date = new Date(
                    Object.values(time.time)[0]
                  ).toLocaleDateString();
                });
                for (let i = 0; i < listOfTimes.length; i++) {
                  if (listOfTimes[i].date === "Invalid Date") {
                    delete listOfTimes[i];
                  }
                }
                listOfTimes.sort((a, b) => {
                  return Object.values(a.time)[0] - Object.values(b.time)[0];
                });
                listOfTimes = groupBy(listOfTimes, "date");
                let timeAccordion = document.getElementById("time-accordion");
                let listofKeys = Object.keys(listOfTimes);
                let count = 0;
                let amountOfDays = listofKeys.length
                if (data.dashboardDayAmountEnabled && data.dashboardDayAmount) {
                  if (amountOfDays > data.dashboardDayAmount) {
                    amountOfDays -= parseInt(data.dashboardDayAmount);
                    for (let i = 0; i < amountOfDays; i++) {
                      listofKeys.shift();
                    }
                    amountOfDays = parseInt(data.dashboardDayAmount);
                  }
                }
                for (let i = amountOfDays - 1; i >= 0; i--) {
                  let date = listofKeys[i];
                  let timeAccordionItem = document.createElement("div");
                  timeAccordionItem.classList.add("accordion-item");
                  let dateFormated = replaceAllNotCSSCharacters(date);
                  let times = listOfTimes[date];
                  let areaExpanded = false;
                  if (count == 0) {
                    areaExpanded = true;
                  }
                  timeAccordionItem.innerHTML = `
                                <h2 class="accordion-header" id="panelsStayOpen-${date}">
                                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-${dateFormated}" aria-expanded="${areaExpanded}" aria-controls="panelsStayOpen-${dateFormated}">
                                        <h3>${date}</h3>
                                    </button>
                                </h2>
                                `;

                  timeAccordion.appendChild(timeAccordionItem);
                  let timeAccourdionBody = document.createElement("div");
                  timeAccourdionBody.id = "panelsStayOpen-" + dateFormated;
                  timeAccourdionBody.classList.add(
                    "accordion-collapse",
                    "collapse"
                  );
                  if (count == 0) {
                    timeAccourdionBody.classList.add("show");
                  }
                  timeAccourdionBody.setAttribute(
                    "aria-labelledby",
                    "panelsStayOpen-" + dateFormated
                  );
                  let timeAccourdionDivTable = document.createElement("div");
                  timeAccourdionDivTable.classList.add(
                    "table-responsive",
                    "accordion-body"
                  );
                  timeAccourdionBody.appendChild(timeAccourdionDivTable);
                  if (count > 0) {
                    timeAccordionItem
                      .getElementsByClassName("accordion-button")[0]
                      .classList.add("collapsed");
                  }
                  count++;
                  let timeAccourdionTable = document.createElement("table");
                  timeAccourdionTable.classList.add("table", "align-middle");
                  timeAccourdionTable.innerHTML = `
                                <thead>
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">Timespan</th>
                                        <th scope="col">Duration</th>
                                        <th scope="col">Commit</th>
                                    </tr>
                                </thead>
                                `;
                  let timeAccourdionTableBody = document.createElement("tbody");
                  let timespans = [];
                  let timeCount = 0;
                  for (const time of times) {
                    if (time.time.hasOwnProperty("startTime")) {
                      timespans.push({
                        issue: time.issue,
                        timespan: [
                          {
                            left: time.time.startTime,
                          },
                        ],
                      });
                    } else if (time.time.hasOwnProperty("resumeTime")) {
                      timespans[timespans.length - 1].timespan.push({
                        left: time.time.resumeTime,
                      });
                    } else if (time.time.hasOwnProperty("stopTime") && times[timeCount-1] && timespans[timespans.length - 1]) {
                      if (!times[timeCount-1].time.hasOwnProperty("pauseTime") && time.time.stopTime !== times[timeCount-1].time.pauseTime) {
                        timespans[timespans.length - 1].timespan.push({
                          right: time.time.stopTime,
                        });
                      }
                      timespans[timespans.length - 1].done = true
                    } else if (time.time.hasOwnProperty("pauseTime") && timespans[timespans.length - 1]) {
                      timespans[timespans.length - 1].timespan.push({
                        right: time.time.pauseTime,
                      });
                    }
                    timeCount++;
                  }
                  for (const timespan of timespans) {
                    let issue = datas.filter(
                      (issue) => issue.id.toString() === timespan.issue
                    )[0];
                    let timeAccourdionTableRow = document.createElement("tr");
                    let duration = getDuration(timespan.timespan);
                    let humanDuration = getHumanDuration(timespan.timespan);
                    let xhumanDuration = humanDuration.replaceAll(" ", "x");
                    chrome.storage.sync.get(
                      [`committed-${issue.id}-${xhumanDuration}`],
                      function (data) {
                        let element = `<button class='commit-button' id='${issue.id}-${xhumanDuration}'>Commit</button>`;
                        if (data[`committed-${issue.id}-${xhumanDuration}`]) {
                          element = `<strong class='commit-done'>Done :)</strong>`;
                        }
                        if (!timespan.done) {
                          element = `<strong>Doing...</strong>`;
                        }
                        timeAccourdionTableRow.innerHTML = `
                                      <td><a href='${
                                        issue.web_url
                                      }' target='_blank'>${
                          issue.references.short
                        }</a></td>
                                      <td>${formatTimespan(
                                        timespan.timespan
                                      )}</td>
                                      <td>${duration}</td>
                                      <td>${element}</td>
                                      `;
                        let buttons =
                          timeAccourdionTableRow.getElementsByClassName(
                            "commit-button"
                          );
                        for (const button of buttons) {
                          button.addEventListener("click", commitTime);
                        }
                        timeAccourdionTableBody.appendChild(
                          timeAccourdionTableRow
                        );
                      }
                    );
                  }
                  timeAccourdionTable.appendChild(timeAccourdionTableBody);
                  timeAccourdionDivTable.appendChild(timeAccourdionTable);
                  timeAccourdionBody.appendChild(timeAccourdionDivTable);
                  timeAccordion.appendChild(timeAccourdionBody);
                }
              }
            });
          });
      }
    }
  );
}

function commitTime() {
  let issueId = this.id.split("-")[0];
  let humanDuration = this.id.split("-")[1].replaceAll("x", " ");
  chrome.storage.sync.get(
    ["gitlabUrl", "gitlabPAT", "gitlabUserID"],
    function (data) {
      if (data.gitlabUrl && data.gitlabPAT && data.gitlabUserID) {
        let request = new Request(
          `${data.gitlabUrl}api/v4/issues?assignee_id=${data.gitlabUserID}&private_token=${data.gitlabPAT}&scope=all&state=opened`,
          {
            headers: {
              "PRIVATE-TOKEN": data.gitlabPAT,
            },
          }
        );
        fetch(request)
          .then((response) => response.json())
          .then((datas) => {
            let issue = datas.filter((issue) => issue.id == issueId)[0];
            let request = new Request(
              `${data.gitlabUrl}api/v4/projects/${issue.project_id}/issues/${issue.iid}/add_spent_time?assignee_id=${data.gitlabUserID}`,
              {
                method: "POST",
                headers: {
                  "PRIVATE-TOKEN": data.gitlabPAT,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  duration: humanDuration,
                }),
              }
            );
            fetch(request);
          });
      }
    }
  );
  chrome.storage.sync.set({ [`committed-${this.id}`]: true });
  this.parentElement.innerHTML = `<strong class='commit-done'>Done :)</strong>`;
}

loadTimetracker();
