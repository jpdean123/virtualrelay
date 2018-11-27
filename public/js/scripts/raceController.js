app.controller('RaceCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {


var raceID = $routeParams.raceid;
var fire = firebase.database();
$scope.user = UserService.getCurrentUser();
console.log($scope.user);

$scope.reg = {

};

var ref = fire.ref().child('races/' + raceID);
var obj = $firebaseObject(ref);

     // to take an action after the data loads, use the $loaded() promise
     obj.$loaded().then(function() {

      //  console.log('object got loaded');
        //initProcessing(obj);
     

    }); // end obj.$loaded()

    // To make the data available in the DOM, assign it to $scope
     //$scope.data = obj;

     // For three-way data bindings, bind it to the scope instead
     obj.$bindTo($scope, "race");

     $scope.$watch('race', function() {
     // console.log('watch saw a change');
    });


$scope.showRegister = true;

 $scope.register = function (){
 	// first create a new team with one of the athletes being this user

 	var newTeam = fire.ref().child('teams').push();


 	var newTeamObj = {
 		name: $scope.reg.team_name,
 		captain: $scope.user.uid,
 		race: raceID,
 		max_athletes: 10,
 		summary: {
 			total_activities: 0,
 			total_athletes: 1,
 			total_distance_meters: 0,
 			total_distance_miles: 0,
 			total_elevation_gain_feet: 0,
 			total_elevation_gain_meters: 0,
 			total_time_seconds: 0

 		}
 	}

 	$scope.teamKey = newTeam.key;
 	$scope.shareLink = "http://localhost:5000/#/invite/" + newTeam.key;
 	$scope.showRegister = false;

 	newTeam.set(newTeamObj);


 	// then add the team to the race
 };


 $scope.goToTeam = function (k){
 	console.log(k);
			$location.path('/team/' + k);
 };




}); // end example controller
