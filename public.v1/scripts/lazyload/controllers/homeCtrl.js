
;(function() {

	var app = angular.module("app.ctrls");
	app.controller("HomeCtrl", ["$scope","$compile","$q", "$location", "$http", "$route", "$timeout", "$firebaseObject", "$routeParams", "$firebaseArray", "UserService",
		function($scope, $compile, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService) {


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
      	$scope.$apply();
        processActivities(user.activities);
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

$scope.activities = [];


function processActivities (actList){

  angular.forEach(actList, function(value, key) {
      var act = value;
            // put distance in miles
       var distanceMeters = math.unit(value.distance, 'm');    
        act.distance_miles = math.number(distanceMeters, 'mi');

      // get elevation gain in feet
      var gainMeters = math.unit(value.total_elevation_gain, 'm');
      act.elevation_gain = math.number(gainMeters, 'ft');

      // make time pretty
      act.time_pretty = moment.duration(value.elapsed_time, 'seconds').format("hh:mm:ss")

      //pretty start time
      act.start_date_pretty = moment(value.start_date).fromNow();

      //get pace
      var secondsPerMile = value.elapsed_time / act.distance_miles;
      act.pace = moment.duration(secondsPerMile, 'seconds').format("mm:ss");

      //push to scope
      $scope.activities.push(act)

  })

};




	}])

//=== #end
})()

