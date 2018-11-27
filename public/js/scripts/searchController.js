app.controller('SearchCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {

var fire = firebase.database();

console.log('hello from search controller');

var users = fire.ref('races');
var query = users.orderByChild('status').equalTo("registration-open");

    query.once('value', function(snap){

      $scope.races = snap.val();
      console.log(snap.val());
      $scope.$apply();

    });

$scope.goToRace = function (key){
  $location.path('/race/' + key);
};


}); // end example controller
