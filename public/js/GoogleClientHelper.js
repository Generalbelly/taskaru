var startingTime= " 9:30:00";
var endingTime = " 18:00:00";
var nextPageToken = null;
var nextSyncToken = null;
var eventList = [];
var deleteList = [];

function loadClientlib(token) {
    gapi.auth.setToken({
      access_token: token
    });
    loadCalendarApi();
}

function checkAuth() {
  return new Promise(function(resolve, reject){
    if (gapi.auth){
      gapi.auth.authorize({
          'client_id': "757836281219-q3rh5p8hro63hb0oglhfasr6f2hvfndc.apps.googleusercontent.com",
          'scope': "https://www.googleapis.com/auth/calendar",
          'immediate': true
      }, function(){
          loadCalendarApi().then(function(){
              console.log("AccessToken got refreshed and calendar api got loaded");
              resolve("success");
          });
      });
    } else {
      reject("notReady")
    }
  })
}

function loadCalendarApi() {
    return new Promise(function(resolve, reject){
        gapi.client.load("calendar", "v3", function(){
            resolve("success");
        });
    })
}

function registerTaskInCalendar(timeMax, timeMin, requiredTime, title, routine) {
  return new Promise(function(resolve, reject) {
    var request = gapi.client.calendar.freebusy.query({
      "timeMin": timeMin,
      "timeMax": timeMax,
      "items": [{"id": "primary"}],
      "timeZone": "Asia/Tokyo"
    });
    request.execute(function(resp) {
      console.log(resp);
      console.log(startingTime);
      console.log(endingTime);
      var timeDiff = null;
      var eStartingTime = null;
      var eEndingTime = null;
      var wStartingTime = null;
      var wEndingTime = null;
      var freeTimeFound = false;
      var taskStartingTime = null;
      var taskEndingTime = null;
      var lastCheckedDate = null;
      var errors = resp.calendars.primary.errors;
      var events = resp.calendars.primary.busy;
      if (typeof errors == "undefined") {
        console.log("come");
        if (events.length == 0) {
          var currentTime = new Date();
          var workStartingTime = new Date(currentTime.toLocaleDateString() + startingTime);
          var workEndingTime =  new Date(currentTime.toLocaleDateString() + endingTime);
          if (currentTime >= workStartingTime && currentTime <= workEndingTime) {
            console.log("It's still working hours");
            taskStartingTime = currentTime;
          } else {
            console.log("It's not working hours anymore");
            if (currentTime < workStartingTime){
              console.log("morning");
              taskStartingTime = new Date(new Date(currentTime.setDate(currentTime.getDate())).toLocaleDateString() + startingTime);
            } else {
              console.log("evening and do it tomorrow");
              console.log(currentTime);
              taskStartingTime = new Date(new Date(currentTime.setDate(currentTime.getDate() + 1)).toLocaleDateString() + startingTime);
              console.log(taskStartingTime);
            }
          }
          createEvents(title, taskStartingTime, requiredTime, routine).then(function(result){
            resolve(result);
          });
        } else {
          var loopAgain = false;
          for (i = 0; i < events.length; i++) {
            var event = events[i];
            eStartingTime = new Date(event.start);
            if (!loopAgain) {
              eEndingTime = new Date(event.end);
            }
            console.log("eventStartingTime is ..." + eStartingTime);
            console.log("eventEndingTime is ..." + eEndingTime);
            eStartingTimeString = eStartingTime.toLocaleDateString();
            eEndingTimeString = eEndingTime.toLocaleDateString();
            if (lastCheckedDate === null || lastCheckedDate !== eStartingTimeString) {
              console.log(lastCheckedDate + " is not equal to " + eStartingTimeString);
              wStartingTime = new Date(eStartingTimeString + startingTime);
              if (wStartingTime.getTime() > (new Date()).getTime()) {
                wStartingTime = new Date();
              }
              wEndingTime = new Date(eEndingTimeString + endingTime);
              lastCheckedDate = eStartingTimeString;
            }
            if (isThereEnoughTime(eStartingTime, eEndingTime, wStartingTime, wEndingTime, requiredTime)) {
              console.log("Enough Time. So Let's create a new event at " + wStartingTime);
              taskStartingTime = wStartingTime;
              freeTimeFound = true;
              break;
            } else {
              console.log("Not Enough Time. So Let's loop through again.");
              if (eEndingTime < wEndingTime) {
                wStartingTime = eEndingTime;
                loopAgain = true;
              }
            }
          }
          if (!freeTimeFound) {
            timeDiff = (wEndingTime - eEndingTime) / (1000 * 60);
            console.log(wEndingTime);
            console.log(eEndingTime);
            console.log("timeDiff is ..." + timeDiff);
            if (timeDiff >= requiredTime && wEndingTime > eEndingTime) {
              freeTimeFound = true;
              var nextDayStartingTime = new Date(eEndingTime.toLocaleDateString() + startingTime);
              console.log(nextDayStartingTime);
              if (eEndingTime.getTime() <= nextDayStartingTime.getTime()) {
                taskStartingTime = nextDayStartingTime;
              } else {
                taskStartingTime = eEndingTime;
              }
              console.log("finally found free time!");
              console.log("You will work on the task from " + taskStartingTime);
              createEvents(title, taskStartingTime, requiredTime, routine).then(function(result){
                resolve(result);
              });
            } else {
              console.log("Sorry, you are too busy...");
              console.log("timeMax:" + timeMax);
              var deadline = new Date(timeMax);
              if (eEndingTime.getTime() < deadline.getTime()) {
                var n = 0;
                if (eEndingTime.getTime() >= wEndingTime.getTime()) {
                  n = 1;
                }
                taskStartingTime = new Date(new Date(eEndingTime.setDate(eEndingTime.getDate() + n)).toLocaleDateString() + startingTime);
                createEvents(title, taskStartingTime, requiredTime, routine).then(function(result){
                  resolve(result);
                });
              } else {
                  console.log("come2");
                  reject("error");
              }
            }
          } else {
            console.log("The task should be registered...");
            createEvents(title, taskStartingTime, requiredTime, routine).then(function(result){
              resolve(result);
            });
          }
        }
      }
    });
  })
}

function isThereEnoughTime(eStartingTime, eEndingTime, wStartingTime, wEndingTime, requiredTime) {
  console.log("eStartingTime " + eStartingTime);
  console.log("eEndingTime " + eEndingTime);
  console.log("wStartingTime " + wStartingTime);
  console.log("wEndingTime " + wEndingTime);
  console.log("requiredTime " + requiredTime);
  var eStartingTime = eStartingTime.getTime();
  var eEndingTime = eEndingTime.getTime();
  var wStartingTime = wStartingTime.getTime();
  var wEndingTime = wEndingTime.getTime();

  if (eEndingTime <= wEndingTime) {
    console.log("bye");
    return false
  } else if (eStartingTime < wStartingTime) {
    console.log("The event is outside working hours");
    if (eEndingTime < wStartingTime) {
      console.log("The next event doesn't start even after this event is done.");
      return false;
    } else {
      console.log("The next event overwraps with this event.");
      return false;
    }
  } else if (eStartingTime >= wEndingTime) {
    console.log("The event is outside working hours");
    return false;
  } else if (eStartingTime < wEndingTime && eStartingTime > wStartingTime ) {
    console.log("The event is within working hours");
    var timeDiff = (eStartingTime - wStartingTime) / (1000 * 60);
    if (timeDiff >= requiredTime && ((new Date().getTime()) - eStartingTime) < 0) {
      return true;
    } else {
      return false;
    }
  } else if (eStartingTime == wStartingTime) {
    console.log("The event is within working hours but it starts from 9:30");
    return false;
  } else {
    console.log("unexpected thing happened.");
    return false;
  }
}

function createEvents(title, startingTime, requiredTime, routine) {
  console.log(startingTime);
  return new Promise(function (resolve, reject) {
    var endingTime = (new Date(startingTime.getTime() + (requiredTime * 60000))).toISOString();
    console.log(startingTime + "," + endingTime);
    var event = {
      "summary": title,
      // 'description': "",
      "start": {
        "dateTime": startingTime,
        "timeZone": "Asia/Tokyo"
      },
      "end": {
        "dateTime": endingTime,
        "timeZone": "Asia/Tokyo"
      }
    };
    if (routine !== null){
      console.log("come34");
      event.recurrence = [
        "RRULE:FREQ=" + routine.freq + ";INTERVAL=" + routine.interval // + ";WKST=" + routine.weekday
      ]
    }
    console.log(event);
    var request = gapi.client.calendar.events.insert({
      "calendarId": "primary",
      "resource": event
    });

    request.execute(function(event) {
      resolve(event);
      console.log("The event got created:");
      console.log(event);
    });
  })
}

function deleteEvent(eventId) {
  return new Promise(function (resolve, reject) {
    var request = gapi.client.calendar.events.delete({
      "calendarId": "primary",
      "eventId": eventId
    });
    request.execute(function(event) {
      console.log("The event got deleted");
      resolve(event);
    });
  })
}

function fetchList(parameters) {
  return new Promise(function (resolve, reject) {
    if (nextPageToken != null) {
      parameters.pageToken = nextPageToken;
      console.log("pageToken is set");
      console.log(parameters);
    } else
    if (nextSyncToken != null) {
      console.log("syncToken is set");
      parameters.syncToken = nextSyncToken;
    }
    if (!gapi.client.calendar) {
      console.log("not ready");
      reject();
    } else {
      var request = gapi.client.calendar.events.list(parameters);
      request.execute(function(resp) {
        if (resp.nextPageToken) {
          nextPageToken = resp.nextPageToken;
          console.log("set pagetoken");
        } else {
          nextPageToken = null;
        }
        console.log("next syncToken is... ");
        if (resp.nextSyncToken) {
          console.log("syncToken is set");
          nextSyncToken = resp.nextSyncToken;
        }
        var events = resp.items;
        if (events.length > 0) {
          for (i = 0; i < events.length; i++) {
            var event = events[i];
            if (event.status === "cancelled") {
              var id = event.id;
              deleteList.push(id);
            } else {
              var item = {};
              var allday = false;
              var when = event.start.dateTime;
              if (!when) {
                when = event.start.date;
                allday = true;
              }
              item.start = when;
              if (!allday) {
                item.end = event.end.dateTime;
              }
              item.title = event.summary;
              item.id = event.id;
              eventList.push(item);
            }
          }
        }
        var result = {
          list: [eventList, deleteList],
          token: nextPageToken
        }
        resolve(result);
      });
    }
  });
}

function promiseLoop(fn, parameters) {
  return new Promise(function(resolve, reject){
    (function loop (fn, parameters) {
        return fn(parameters)
          .then(function(result) {
            if (result.token != null) {
              loop(fn, parameters);
            } else {
              resolve(result.list);
            }
          })
          .catch(function() {
            reject();
          })
      })(fn, parameters);
  })
}

function listUpcomingEvents() {
  return new Promise(function (resolve, reject) {
    eventList = [];
    deleteList = [];
    var parameters = {
       'calendarId': 'primary',
       'singleEvents': true
    };
    promiseLoop(fetchList, parameters)
      .then(function(list){
        console.log("done");
        console.log(nextSyncToken);
        resolve(list);
      })
      .catch(function(){
        reject();
      })
  });
}

function updateEvent(ev) {
  return new Promise(function (resolve, reject) {
    var event = {
      // "summary": title,
      // // 'description': "",
      "id": ev.id,
      "start": {
        "dateTime": ev.start.toISOString(),
        "timeZone": "Asia/Tokyo"
      },
      "end": {
        "dateTime": ev.end.toISOString(),
        "timeZone": "Asia/Tokyo"
      }
    };
    // if (title !== null){
    //   console.log("come33");
    //   event.summary = title;
    // }
    // if (routine !== null){
    //   console.log("come34");
    //   event.recurrence = [
    //     "RRULE:FREQ=" + routine.freq + ";INTERVAL=" + routine.interval // + ";WKST=" + routine.weekday
    //   ];
    // }
    console.log(ev.id);
    var request = gapi.client.calendar.events.patch({
       "calendarId": "primary",
       "eventId": ev.id,
       "resource": event
    });

    request.execute(function(event) {
      resolve(event);
      console.log("The event got updated:");
      console.log(event);
    });
  })
}
