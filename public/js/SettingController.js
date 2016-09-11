(function() {
    'use strict';
    angular
        .module("myApp")
        .controller("SettingCtrl", settingController);

    settingController.$inject = ["sharedService", "currentAuth"];
    function settingController(sharedService, currentAuth) {
        var svm = this;
        svm.authenticateUser = authenticateUser;
        svm.userpic = "https://placekitten.com/g/200/300";
        svm.username = "";

        function authenticateUser() {
            sharedService.signIn();
        };

        if (currentAuth === null) {
            window.location.replace("#/login");
            console.log("booo");
        } else {
          if (currentAuth.photoURL !== null) {
            svm.userpic = currentAuth.photoURL;
          }
          console.log(svm.userpic);
          svm.username = currentAuth.displayName;
        }

    }
})();
