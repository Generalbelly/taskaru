(function() {
    'use strict';

    angular
        .module("myApp")
        .factory("sharedService", sharedService);

    sharedService.$inject = ["$firebaseAuth", "$firebaseObject"];
    function sharedService($firebaseAuth, $firebaseObject) {
        var auth = $firebaseAuth();
        auth.$onAuthStateChanged(checkUserStatus);
        var sharedService = {
            getTaskPath: getTaskPath,
            getTaskNamePath: getTaskNamePath,
            getProjectPath: getProjectPath,
            getCompTaskPath: getCompTaskPath,
            getRoutinePath: getRoutinePath,
            getWHPath: getWHPath,
            auth: auth,
            signIn: signIn,
            signOut: signOut,
            getFirebaseUser: getFirebaseUser
        };

        return sharedService;

        function getTaskPath() {
            return "tasks/" + getFirebaseUser().uid + "/items/";
        }

        function getTaskNamePath() {
            return "tasks/" + getFirebaseUser().uid + "/tasknames/";
        }

        function getProjectPath() {
            return "tasks/" + getFirebaseUser().uid + "/projects/";
        }

        function getCompTaskPath() {
            return "tasks/" + getFirebaseUser().uid + "/compItems/";
        }

        function getRoutinePath() {
            return "tasks/" + getFirebaseUser().uid + "/routines/";
        }

        function getWHPath() {
            return "preference/" + getFirebaseUser().uid + "/workingHours/";
        }

        function getFirebaseUser() {
            return auth.$getAuth();
        }

        function signIn() {
            console.log("calleddddd");
            var provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope("email");
            provider.addScope("profile");
            provider.addScope("https://www.googleapis.com/auth/calendar");
            auth.$signInWithRedirect(provider).then(function() {
            }).catch(function(error) {
                console.error("Authentication failed:", error);
            });
        }

        function signOut() {
            auth.$signOut();
            window.location.replace("#/");
        }

        function checkUserStatus(firebaseUser) {
            if (firebaseUser) {
                console.log("Signed in as:", firebaseUser.uid);
                if (!tokenSet) {
                    firebase.auth().getRedirectResult().then(function(result) {
                        if (result.credential) {
                            var accessToken = result.credential.accessToken;
                            loadClientlib(accessToken);
                            // var refreshToken = result.user.refreshToken;
                            // var obj = $firebaseObject(firebase.database().ref().child(getRoutinePath()));
                            // obj.$value = refreshToken;
                            // obj.$save().then(function(ref) {
                            //   loadClientlib(accessToken);
                            // }, function(error) {
                            //   console.log("Error:", error);
                            // });
                        }
                    }).catch(function(error) {
                        var errorCode = error.code;
                        var errorMessage = error.message;
                        var email = error.email;
                        var credential = error.credential;
                        console.log(error);
                    });
                }
            } else {
                console.log("Signed out");
            }
        }
    }
})();
