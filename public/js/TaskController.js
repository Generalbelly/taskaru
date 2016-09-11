(function() {
    'use strict';
    angular
        .module("myApp")
        .controller("TaskCtrl", taskController);

    taskController.$inject = [
        "$scope",
        "$firebaseObject",
        "$firebaseArray",
        "sharedService",
        "$mdDialog",
        "currentAuth"
    ];

    function taskController($scope, $firebaseObject, $firebaseArray, sharedService, $mdDialog, currentAuth) {
      $scope.selectedTaskname = null;
      $scope.selectedProject = null;
      $scope.estimated_time = null;
      $scope.deadline = null;
      $scope.priority = null;
      $scope.routine = null;
      $scope.addTask = addTask;
      $scope.showPrompt = showPrompt;
      $scope.compButtonClicked = compButtonClicked;
      $scope.onRoutineChanged = onRoutineChanged;
      $scope.deleteButtonClicked = deleteButtonClicked;
      $scope.querySearch = querySearch;
      $scope.checkDate = checkDate;
      $scope.readdButtonClicked = readdButtonClicked;


      var tasknameList = [];
      var projectList = [];

      if (currentAuth != null) {
        fetchOptions(sharedService.getTaskNamePath());
        fetchOptions(sharedService.getProjectPath());
        fetchTasks();
        fetchCompleteTasks();
        fetchRoutines();
        checkWorkingHours();
        createCalendar();
      };

      function createCalendar() {
        listUpcomingEvents()
          .then(function(list){
            if (list.length > 0) {
              setEventsInFullCalendar(list);
            }
          })
          .catch(function(e){
            console.log("あーあ");
            checkAuth().then(function(result){
              listUpcomingEvents()
              .then(function(list){
                console.log("success");
                if (list.length > 0) {
                  setEventsInFullCalendar(list);
                }
              })
              .catch(function(e){
                console.log("errrr" + e);
              })
            });
          })
      }

      function setEventsInFullCalendar(list) {
        console.log(list);
        $("#calendar").fullCalendar({
          header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay,listWeek'
          },
          navLinks: true, // can click day/week names to navigate views
			    editable: true,
          events: {
            events: list
          }
        })
      }

      function checkWorkingHours() {
        var startingTimeObj = $firebaseObject(firebase.database().ref().child(sharedService.getWHPath()+"startingTime"));
        var endingTimeObj = $firebaseObject(firebase.database().ref().child(sharedService.getWHPath()+"endingTime"));
        loadedObjectHandler("start", startingTimeObj);
        loadedObjectHandler("end", endingTimeObj);
      }

      function loadedObjectHandler(name, obj) {
        obj.$loaded().then((function(pathname) {
          return function(){
            setWorkingHours(pathname, obj.$value);
            addWatch(pathname, obj);
          }
        })(name));
      }

      function addWatch(name, obj) {
        obj.$watch((function(pathname){
          return function(event){
            console.log(event.event);
            console.log("watch");
            if (event.event === "value"){
              setWorkingHours(pathname, obj.$value);
            }
          }
        })(name));
      }

      function setWorkingHours(name, time) {
        if (time != null) {
          if (name == "start") {
            startingTime = " " + time;
          } else {
            endingTime = " " + time;
          }
        }
        console.log("startingTime is " + startingTime);
        console.log("endingTime is " + endingTime);
      }

      var today = (new Date()).getTime();
      function checkDate(date) {
        var td = (new Date(date)).getTime();
        console.log("compare" + td + "&" + today);
        if ( td >= today ) {
          console.log("true1");
          return true;
        } else {
          console.log("false");
          return false;
        }
      }

      function fetchOptions(path) {
        var optionsRef = firebase.database().ref(path);
        optionsRef.on('child_added', (function(path){
            return function(data) {
              if (path.indexOf("tasknames") !== -1){
                tasknameList.push(data.val().value);
              } else {
                console.log(data.val().value);
                projectList.push(data.val().value);
              }
            }
          })(path)
        );
      }

      function querySearch (list, query) {
        var results;
        if (list == "tasknameList"){
          results = query ? tasknameList.filter( createFilterFor(query)) : tasknameList;
        } else {
          results = query ? projectList.filter( createFilterFor(query)) : projectList;
        }
        return results;
      }

      function createFilterFor(query) {
        return function filterFn(item) {
          return (item.indexOf(query) === 0);
        };
      }

      function onRoutineChanged(value) {
        if (value) {
          var parentEl = angular.element(document.body);
          $mdDialog.show({
            parent: parentEl,
            clickOutsideToClose: true,
            // Only while dev/debug. Remove later.
            templateUrl: "../views/routineDialog.html?nd=" + Date.now(),
            controller: DialogCtrl
          }).then(function(answer) {
            console.log(answer);
            $scope.routine = answer;
          }, function() {
            $scope.routineSwitch = false;
          });
        }
      }

      function readdButtonClicked(item) {
          console.log(item);
          console.log("readdButtonClicked");
          var parentEl = angular.element(document.body);
          var readdedTask = {
            "estimated_time": item.estimated_time,
            "priority": item.priority
          }
          $mdDialog.show({
            locals: { readdedTask: readdedTask },
            parent: parentEl,
            clickOutsideToClose: true,
            // Only while dev/debug. Remove later.
            templateUrl: "../views/readdDialog.html?nd=" + Date.now(),
            controller: DialogCtrl
          }).then(function(answer) {
            console.log(answer);
            // you need handle errors later.
            $scope.selectedTaskname = item.taskname;
            $scope.selectedProject = item.project;
            $scope.estimated_time = answer.estimated_time;
            $scope.deadline = answer.deadline;
            $scope.priority = answer.priority;
            console.log("item id is...");
            console.log(item.$id);
            addTask(item.$id);
          }, function() {
            console.log("cancelled");
          });
      }

      function compButtonClicked(task) {
        var taskList = $scope.taskList;
        var item = taskList[taskList.$indexFor(task.$id)];
        var addModal = $mdDialog.prompt()
          .title("タスクの完了時間")
          .textContent("タスクにかかった実際の時間（分）を入力してください")
          .placeholder("30")
          .ok("完了")
          .cancel("キャンセル");
        $mdDialog.show(addModal).then(function(result) {
          taskList.$remove(item).then(function(ref) {
            task.completion_time = Number(result);
            $scope.compTaskList.$add(task).then(function(){console.log("COMPLETE");});
          });
        }, function() {
          console.log("you cancelled");
          console.log(task.$id);
        });
      }

      function deleteButtonClicked(type, id) {
        console.log(type);
        var taskList;
        if (type=="incomp") {
          taskList = $scope.taskList;
        } else if (type=="comp"){
          taskList = $scope.compTaskList;
        } else {
          taskList = $scope.routineList;
        }
        var item = taskList[taskList.$indexFor(id)];
        var confirm = $mdDialog.confirm()
          .title("タスクの削除")
          .textContent("本当に削除してよろしいですか？")
          .ok("OK")
          .cancel("キャンセル");
        $mdDialog.show(confirm).then(function(result) {
          taskList.$remove(item).then(function(ref) {
            console.log("DELETED");
          });
        }, function() {
          console.log("you cancelled");
        });
      }

      function fetchTasks() {
        var taskRef = firebase.database().ref().child(sharedService.getTaskPath());
        $scope.taskList = $firebaseArray(taskRef);
      }

      function fetchCompleteTasks() {
        var compTaskRef = firebase.database().ref().child(sharedService.getCompTaskPath());
        $scope.compTaskList = $firebaseArray(compTaskRef);
      }

      function fetchRoutines() {
        var routineRef = firebase.database().ref().child(sharedService.getRoutinePath());
        $scope.routineList = $firebaseArray(routineRef);
      }

      function addTask(readded) {
        var recurrence = false;
        var taskList = $scope.taskList;
        if ($scope.selectedTaskname === null) {
          openMessageModal("未入力の項目があります", "タスクが入力されていません。");
          return;
        } else if ($scope.selectedProject === null) {
          openMessageModal("未入力の項目があります", "プロジェクトが入力されていません。");
          return;
        } else if ($scope.estimated_time === null){
          openMessageModal("未入力の項目があります", "想定時間が入力されていません。");
          return;
        } else if ($scope.deadline === null ) {
          openMessageModal("未入力の項目があります", "期日が入力されていません。");
          return;
        }
        if ($scope.priority === null ){
          taskData.priority = "middle"
        }
        var taskData = {
          "taskname": $scope.selectedTaskname,
          "project": $scope.selectedProject,
          "estimated_time": $scope.estimated_time * 60,
          "deadline": $scope.deadline.toLocaleDateString(),
          "priority": $scope.priority
        };
        if ($scope.routine !== null){
          recurrence = true;
          console.log("adding a routine");
          taskList = $scope.routineList;
        }
        console.log("here");
        console.log(taskData);
        taskList.$add(taskData).then(function(ref) {
          var id = ref.key;
          console.log(id);
          //createTheEventInCal(id, taskData, recurrence, readded)
        });
      }

      function createTheEventInCal(id, taskData, recurrence, readded) {
        var timeMax = (new Date(taskData.deadline + " 23:59:00")).toISOString();
        var timeMin = (new Date()).toISOString();
        var routine = null;
        if (recurrence) {
          var ref = $scope.routine;
          routine = {
            "freq": ref.freq,
            "interval": ref.interval
          }
        }
        registerTaskInCal(id, timeMax, timeMin, taskData, routine)
          .then(function(result){
            console.log("done");
            calndarRegistrationDidsucceed(result, taskData, readded);
          })
          .catch(function(e){
              console.log(e);
              if (e == "error") {
                calndarRegistrationDidfail();
              } else {
                  console.log("あーあ");
                  checkAuth().then(function(result){
                    registerTaskInCal(id, timeMax, timeMin, taskData, routine).then(function(result){
                      console.log("done");
                      calndarRegistrationDidsucceed(result, taskData, readded);
                    })
                    .catch(function(e){
                        console.log(e);
                        if (e == "error") {
                          calndarRegistrationDidfail();
                        }
                    })
                  });
              }
          })
      }

      function registerTaskInCal(id, timeMax, timeMin, taskData, routine) {
        var taskList = $scope.taskList;
        return new Promise(function(resolve, reject) {
          registerTaskInCalendar(timeMax, timeMin, taskData.estimated_time, taskData.taskname + " " + taskData.project, routine)
            .then(function(result){
              if (routine) {
                taskList = $scope.routineList;
              }
              var index = taskList.$indexFor(id);
              taskList[index].calendarId = result.id;
              taskList.$save(index).then(function(ref) {
                resolve(result);
              });
            })
            .catch(function(e){
                console.log(e);
                reject(e);
            })
          })
      }

      function calndarRegistrationDidfail(){
          openMessageModal("カレンダーへの登録失敗", "申し訳ございません。\n期日までの予定はすでにいっぱいのようです。");
          clearTaskInput();
      }

      function calndarRegistrationDidsucceed(result, taskData, readded){
          openMessageModal("カレンダーへの登録完了", taskData.project + "の" + taskData.taskname + "を " + new Date(result.start.dateTime).toLocaleString() + " - " + new Date(result.end.dateTime).toLocaleString() + " に設定しました。");
          console.log(readded);
          if(readded != ""){
            var taskList = $scope.taskList;
            var item = taskList[taskList.$indexFor(readded)];
            taskList.$remove(item).then(function(ref) {
              console.log("DELETED");
            });
          }
          clearTaskInput();
      }

      function clearTaskInput() {
        $scope.selectedTaskname = null;
        $scope.selectedProject = null;
        $scope.estimated_time = null;
        $scope.deadline = null;
        $scope.priority = null;
        $scope.taskForm.$setPristine();
        $scope.taskForm.$setUntouched();
        $scope.routineSwitch = false;
        $scope.routine = null;
      }

      function showPrompt(index, item) {
        console.log(item);
        var variables = null;
        if (index == 0) {
          variables = {
              "title": "タスク",
              "path": sharedService.getTaskNamePath()
          };
        } else {
          variables = {
              "title": "プロジェクト",
              "path": sharedService.getProjectPath()
          };
        }
        var addModal = $mdDialog.prompt()
          .title(variables.title + "の新規追加")
          .textContent(variables.title + "名を入力してください")
          .initialValue(item)
          .ariaLabel(variables.title + "の新規追加")
          .ok("追加")
          .cancel("キャンセル");
        $mdDialog.show(addModal).then(function(result) {
          saveItem(result, variables.path, variables.title);
        }, function() {
          console.log("you cancelled");
        });
      }

      function saveItem(item, path, type) {
        firebase.database().ref(path).once('value').then(function(snapshot) {
          console.log(path);
          var optionKey;
          var saveOption = function() {
            optionKey = firebase.database().ref(path).push().key;
            var data = {
                "id": optionKey,
                "value": item
            }
            firebase.database().ref(path + String(optionKey)).set(data);
          }
          if (!snapshot.exists()) {
            saveOption();
          } else {
            var exists = false;
            snapshot.forEach(function(childSnapshot) {
              var value = childSnapshot.val().value;
                  console.log(value);
                  if (value == item) {
                      exists = true;
                  }
            })
            if (!exists) {
              saveOption();
            } else {
              openMessageModal(type + "の重複", item + "はすでに登録されています。");
              console.log("same name already exists");
            }
          }
        });
      }

      function openMessageModal(title, description) {
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title(title)
            .textContent(description)
            .ok("OK")
        );
      }

      function DialogCtrl($scope, $mdDialog, readdedTask) {
        $scope.hide = hide;
        $scope.cancel = cancel;
        $scope.answer = answer;
        $scope.readdedTask = readdedTask;

        function hide() {
          $mdDialog.hide();
        }

        function cancel() {
          $mdDialog.cancel();
        }

        function answer(answer) {
          console.log(answer);
          $mdDialog.hide(answer);
        }
      }
    }

})();