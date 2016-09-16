var tokenSet = false;
var currentTime = new Date();
var startingTime= " 9:30:00";
var endingTime = " 18:00:00";
var nextPageToken = null;
var nextSyncToken = null;
var min = new Date(currentTime.setDate(currentTime.getDate() - 30)).toISOString();

function loadClientlib(token) {
    gapi.auth.setToken({
        access_token: token
    });
    loadCalendarApi();
}

function checkAuth() {
  return new Promise(function(resolve, reject){
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
  console.log(routine);
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
              taskStartingTime = new Date(new Date(currentTime.setDate(currentTime.getDate() + 1)).toLocaleDateString() + startingTime);
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
            console.log("eventEndingTime is ..." + eEndingTime);
            eStartingTimeString = eStartingTime.toLocaleDateString();
            eEndingTimeString = eEndingTime.toLocaleDateString();
            if (lastCheckedDate === null || lastCheckedDate !== eStartingTimeString) {
              console.log(lastCheckedDate + " is not equal to " + eStartingTimeString);
              wStartingTime = new Date(eStartingTimeString + startingTime);
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
            if (timeDiff >= requiredTime) {
              freeTimeFound = true;
              taskStartingTime = eEndingTime;
              console.log("finally found free time!");
              console.log("You will work on the task from " + taskStartingTime);
              createEvents(title, taskStartingTime, requiredTime, routine).then(function(result){
                resolve(result);
              });
            } else {
              console.log("Sorry, you are too busy...");
              console.log("timeMax:" + timeMax);
              var deadline = new Date(timeMax).toLocaleDateString();
              if (eEndingTime < deadline) {
                taskStartingTime = new Date(new Date(eEndingTime.setDate(eEndingTime.getDate())).toLocaleDateString() + startingTime);
                console.log("Wait, you still have time.");
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
  if (eStartingTime < wStartingTime) {
    console.log("The event is outside working hours");
    if (eEndingTime < wStartingTime) {
      console.log("The next event doesn't start even after this event is done.");
      console.log(eStartingTime + ", " + wStartingTime);
      return false;
    } else {
      console.log("The next event overwraps with this event.");
      console.log(eStartingTime + ", " + wStartingTime);
      return false;
    }
  } else if (eStartingTime >= wEndingTime) {
    console.log("The event is outside working hours");
    console.log(eStartingTime + ", " + wStartingTime);
    return false;
  } else if (eStartingTime < wEndingTime && eStartingTime > wStartingTime ) {
    console.log("The event is within working hours");
    console.log(eStartingTime + ", " + wStartingTime);
    var timeDiff = (eStartingTime - wStartingTime) / (1000 * 60);
    console.log("Time difference is ..." + timeDiff);
    console.log("requiredTime is ..." + requiredTime);
    if (timeDiff >= requiredTime && (new Date().getTime()) - eStartingTime.getTime() < 0) {
      return true;
    } else {
      return false;
    }
  } else if (eStartingTime.getTime() == wStartingTime.getTime()) {
    console.log("The event is within working hours but it starts from 9:30");
    console.log(eStartingTime + ", " + wStartingTime);
    return false;
  } else {
    console.log("unexpected thing happened.");
    console.log(eStartingTime + ", " + wStartingTime);
    return false;
  }
}

function createEvents(title, startingTime, requiredTime, routine) {
  console.log(routine);
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

var lastTimeParams = {};

function listUpcomingEvents() {
  return new Promise(function (resolve, reject) {
    var params = {};
    var parameters = {
       'calendarId': 'primary',
       'timeMin': min,
       'showDeleted': false,
       'singleEvents': true,
       'orderBy': 'startTime'
    };
    // params = parameters;
    // if (nextPageToken != null) {
    //   lastTimeParams.pageToken = nextPageToken;
    //   params = lastTimeParams;
    //   console.log("pageToken is set");
    //   console.log(parameters);
    // } else if (nextSyncToken != null) {
    //   lastTimeParams.syncToken = nextSyncToken;
    //   params = lastTimeParams;
    // }
    var request = gapi.client.calendar.events.list(parameters);
    lastTimeParams = parameters;
    request.execute(function(resp) {
      var eventList = [];
      console.log(resp);
      console.log(resp.nextPageToken);
      if (resp.nextPageToken) {
        nextPageToken = resp.nextPageToken;
        console.log("set pagetoken");
      } else if (nextPageToken != null) {
        nextPageToken = null;
      }
      if (resp.syncToken) {
        console.log("syncToken is set");
        nextSyncToken = resp.syncToken;
      } else if (nextSyncToken != null) {
        nextSyncToken = null;
      }
      var events = resp.items;
      console.log(events);
      if (events.length > 0) {
        for (i = 0; i < events.length; i++) {
          var item = {};
          var allday = false;
          var event = events[i];
          var when = event.start.dateTime;
          if (!when) {
            when = event.start.date;
            allday = true;
          }
          item.start = when;
          console.log(when);
          if (!allday) {
            item.end = event.end.dateTime;
          }
          item.title = event.summary;
          item.id = event.id;
          eventList.push(item);
        }
      }
      resolve(eventList);
    });
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
