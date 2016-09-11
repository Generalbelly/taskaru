(function() {
    'use strict';
    angular
        .module("myApp", [
            "ngRoute",
            "firebase",
            "ngMaterial",
            "md.data.table",
            "ngMessages"
        ])
        .config(routerHelperConfig)
        .run(routerHelperRun);

    routerHelperConfig.$inject = ["$routeProvider"];
    function routerHelperConfig($routeProvider) {
        $routeProvider
            .when("/", {
              templateUrl: "views/login.html",
              controller: "LoginCtrl",
              controllerAs: "vm",
              resolve: {
                  "currentAuth": ["sharedService", function(sharedService) {
                      console.log("looking good...");
                      return sharedService.auth.$waitForSignIn();
                  }]
              }
            })
            .when("/home", {
                templateUrl: "views/mytask.html",
                controller: "TaskCtrl",
                controllerAs: "tvm",
                bindToController: true,
                resolve: {
                    "currentAuth": ["sharedService", function(sharedService) {
                        console.log("looking good too...");
                        return sharedService.auth.$requireSignIn();
                    }]
                }
            });
    }

    routerHelperRun.$inject = ["$rootScope", "$location", "$templateCache"];
    function routerHelperRun($rootScope, $location, $templateCache) {
        // for development
        $rootScope.$on("$routeChangeSuccess", function() {
          $templateCache.removeAll();
        });

        $rootScope.$on("$routeChangeError", function(event, next, previous, error) {
        if (error === "AUTH_REQUIRED") {
                $location.path("/");
            }
        });
    }
})();
