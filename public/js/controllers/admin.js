app.controller('AdminCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {

    var newObj = firebase.database().ref().child('user_teams' + "/" + "-L26iGEPksIZrtbcSwnT" + "/" + "-LOQeSY79oqrWou31ieq")
    var newTeam = {
       team_name: "Beta Team"
    };
    newObj.set(newTeam)

});
