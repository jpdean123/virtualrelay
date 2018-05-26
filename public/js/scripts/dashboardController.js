app.controller('DashCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {
  
var fire = firebase.database();
$scope.user = UserService.getCurrentUser();

console.log('dashboard controller');
$scope.strava_token = false;


var users = fire.ref('users');
var query = users.orderByChild('owner').equalTo($scope.user.uid);

    query.once('value', function(snap){

      var k = Object.keys(snap.val())[0];
      var user = snap.val()[k];
      if (user.strava_token) {
      	$scope.strava_token = true;
      	$scope.activities = user.activities;
      	$scope.$apply();
     
      }
      init(k);
   console.log(user);


    });


function init(k){
	var userEventsRef = firebase.database().ref("userEvents/" + k);
	userEventsRef.once("value")
	  .then(function(snapshot) {
	    $scope.events = snapshot.val();

	    $scope.$apply();
	  });

};

$scope.goToEvent = function (key){
	$location.path('/event/' + key);
};


});