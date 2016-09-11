var tokenSet = false;
var startingTime= " 9:30:00";
var endingTime = " 18:00:00";

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
      "timeZone": "Japan"
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
          if (currentTime > new Date(currentTime.toLocaleDateString() + startingTime) && currentTime < new Date(currentTime.toLocaleDateString() + endingTime)) {
            console.log("It's still working hours");
            taskStartingTime = currentTime;
          } else {
            taskStartingTime = new Date(new Date(currentTime.setDate(currentTime.getDate())).toLocaleDateString() + startingTime);
          }
          createEvents(title, taskStartingTime, requiredTime, routine).then(function(result){
            resolve(result);
          });
        } else {
          for (i = 0; i < events.length; i++) {
            var event = events[i];
            eStartingTime = new Date(event.start);
            eEndingTime = new Date(event.end);
            console.log("eventEndingTime is ..." + eEndingTime);
            eStartingTimeString = eStartingTime.toLocaleDateString();
            eEndingTimeString = eEndingTime.toLocaleDateString();
            if (lastCheckedDate == null || lastCheckedDate !== eStartingTimeString) {
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
              if (eEndingTime < wEndingTime) { wStartingTime = eEndingTime; }
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
        "timeZone": "Japan"
      },
      "end": {
        "dateTime": endingTime,
        "timeZone": "Japan"
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

function listUpcomingEvents() {
  return new Promise(function (resolve, reject) {
    var request = gapi.client.calendar.events.list({
       'calendarId': 'primary',
       'timeMin': (new Date()).toISOString(),
       'showDeleted': false,
       'singleEvents': true,
       'orderBy': 'startTime'
    });
    request.execute(function(resp) {
      var events = resp.items;
      var eventList = [];
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
          if (!allday) {
            item.end = event.end.dateTime;
          }
          item.title = event.summary;
          item.id = event.id;
          eventList.push(item);
           // some events fetched
        }
        resolve(eventList);
      } else {
        resolve(eventList);
         // no coming events.
      }
    });
  });
}

function updateEvent(title, startingTime, requiredTime, routine, eventId) {
  return new Promise(function (resolve, reject) {
    var endingTime = (new Date(startingTime.getTime() + (requiredTime * 60000))).toISOString();
    console.log(startingTime + "," + endingTime);
    var event = {
      "summary": title,
      // 'description': "",
      "start": {
        "dateTime": startingTime,
        "timeZone": "Japan"
      },
      "end": {
        "dateTime": endingTime,
        "timeZone": "Japan"
      }
    };
    if (title !== null){
      console.log("come33");
      event.summary = title;
    }
    if (routine !== null){
      console.log("come34");
      event.recurrence = [
        "RRULE:FREQ=" + routine.freq + ";INTERVAL=" + routine.interval // + ";WKST=" + routine.weekday
      ];
    }
    console.log(event);
    var request = gapi.client.calendar.events.update({
       "calendarId": "primary",
       "eventId": eventId,
       "resource": event
    });

    request.execute(function(event) {
      resolve(event);
      console.log("The event got updated:");
      console.log(event);
    });
  })
}
