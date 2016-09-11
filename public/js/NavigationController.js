(function() {
    'use strict';
    angular
        .module("myApp")
        .controller("NavCtrl",  navcontroller);

    navcontroller.$inject = ["$location", "sharedService", "$mdDialog", "$firebaseObject"];
    function navcontroller($location, sharedService, $mdDialog, $firebaseObject) {
      var nvm = this;
      nvm.username = null;
      nvm.userpic = null;
      var auth = sharedService.auth;
      auth.$onAuthStateChanged(getUsername);
      nvm.currentPath = $location.path();
      nvm.openMenu = openMenu;
      nvm.settingClicked = settingClicked;
      nvm.signOut = sharedService.signOut;
      var originatorEv = null;

      window.onhashchange = locationHashChanged;
      getUsername();

      function openMenu($mdOpenMenu, ev) {
         originatorEv = ev;
         $mdOpenMenu(ev);
       }

      function settingClicked() {
        console.log("clicked");
        var parentEl = angular.element(document.body);
        var userForm = {
          "endingTime": endingTime.replace(/\s+/g, ""),
          "startingTime": startingTime.replace(/\s+/g, "")
        };
        $mdDialog.show({
          parent: parentEl,
          locals:{ userForm: userForm },
          clickOutsideToClose: true,
          // Only while dev/debug. Remove later.
          templateUrl: "../views/setting.html?nd=" + Date.now(),
          controller: DialogCtrl
        }).then(function(answer) {
          console.log(answer);
          checkWorkingHours(answer);
        }, function() {
          console.log("you clicked cancelled");
        });
      }

      function checkWorkingHours(hours) {
        var newStartingTime = hours.startingTime;
        var newEndingTime = hours.endingTime;
        var whRef = firebase.database().ref().child(sharedService.getWHPath());
        var obj = $firebaseObject(whRef);
        saveTime(obj, newStartingTime, newEndingTime);
      }

      function saveTime(obj, time1, time2) {
        obj.startingTime = time1;
        obj.endingTime = time2;
        obj.$save().then(function(ref) {
          console.log("successfully saved");
        }, function(error) {
          console.log("Error:", error);
        });
      }

      function getUsername(firebaseUser) {
        var user = firebaseUser;
        if (user != null && nvm.username === null ) {
          nvm.username = user.displayName;
          if (user.photoURL !== null && nvm.userpic === null) {
            nvm.userpic = user.photoURL;
          }
        }
      }

      function locationHashChanged() {
          console.log(location.hash);
          nvm.currentPath = location.hash;
      }

      function DialogCtrl($scope, $mdDialog, userForm) {
        $scope.hide = hide;
        $scope.cancel = cancel;
        $scope.userForm = userForm;
        $scope.answer = answer;

        function hide() {
          console.log("mddialogのhide引数なし");
          $mdDialog.hide();
        }

        function cancel() {
          $mdDialog.cancel();
        }

        function answer(answer) {
          $mdDialog.hide(answer);
        }
      }
    }
})();
