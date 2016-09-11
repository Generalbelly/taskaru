(function() {
    'use strict';
    angular
        .module("myApp")
        .controller("LoginCtrl", loginController);

    loginController.$inject = ["sharedService", "currentAuth"];
    function loginController(sharedService, currentAuth) {
        var vm = this;
        vm.authenticateUser = authenticateUser;

        function authenticateUser() {
            sharedService.signIn();
        };

        if (currentAuth != null) {
            console.log("user logged in");
            window.location.replace("#/home");
        } else {
            console.log("booo");
        }

    }
})();
