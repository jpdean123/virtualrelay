app.controller('AdminCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {

var fire = firebase.database();


console.log('hello from admin controller');

$scope.newRace = {};
$scope.newRace.private = false;

$scope.createRace = function () {

   var start_formatted = getFormattedDates($scope.newRace.start_date, true);
   var end_formatted = getFormattedDates($scope.newRace.end_date, false);

   console.log(start_formatted);
   console.log(end_formatted);

   var obj = {
    start_date : start_formatted,
    end_date : end_formatted,
    title: $scope.newRace.title,
    status: "registration-open",
    max_teams: $scope.newRace.teams,
    max_athletes_team: $scope.newRace.athletes,
    private: $scope.newRace.private
   };

   console.log(obj);
    var newObj = fire.ref().child('races').push();

  newObj.set(obj);
};

function getFormattedDates (dayString, start){
     var x = dayString;
     if (start) {
        var y = moment(x).startOf('month');
    } else {
        var y = moment(x).endOf('month');
    }
    y.tz('America/Los_Angeles');
    y.utc();
    
    return y.format();
}

























// previous code below: 

    // var newObj = firebase.database().ref().child('user_teams' + "/" + "-L26iGEPksIZrtbcSwnT" + "/" + "-LOQeSY79oqrWou31ieq")
    // var newTeam = {
    //    team_name: "Beta Team"
    // };
    // newObj.set(newTeam)




    // var newObj = firebase.database().ref().child('teams' + "/" + "-LOQeSY79oqrWou31ieq" + "/" + "athletes" + "/" + "-L26iGEPksIZrtbcSwnT")
    // var newTeam = {
    //   "summary": {
    //     "total_activities" : 0,
    //     "total_distance_meters" : 0,
    //     "total_distance_miles" : 0,
    //     "total_elevation_gain_feet" : 0,
    //     "total_elevation_gain_meters" : 0,
    //     "total_time_seconds" : 0
    //     }
    //   };

    // newObj.set(newTeam)


// console.log('heres the admin challenge');
// $scope.missedActivities = [];
// $scope.athletes = [];
// $scope.fbActivities = [];
// var selectedAthlete;

// var eventID = "-L-s5mzXCE6iEwT0OQ0T";

// var ref = firebase.database().ref().child('events/' + eventID + '/athletes');
// var obj = $firebaseObject(ref);

// obj.$loaded().then(function() {

//       angular.forEach(obj, function(value, key) {
//         var athObj = {
//           athId: value.athlete.id,
//           athName: value.athlete.firstname + " " + value.athlete.lastname,
//           athFBId: key,
//           stID: value.strava_token
//         }
//           $scope.athletes.push(athObj);
//        });

//     }); // end obj.$loaded()



// $scope.loadAthlete = function (x){
//   selectedAthlete = '';
//   selectedAthlete = $scope.athletes[x];
//   $scope.fbActivities = [];
//   $scope.recents ='';
//   var arr = [];
//   var obj = {
//     strava_token: $scope.athletes[x].stID
//   }
//   arr.push(obj);

//   StravaService.getStravaActivities(arr).then(function(r){ 
//     $scope.recents = r[0].data;
//     pullFBActivities($scope.athletes[x].athFBId);

//   });

// };

// function pullFBActivities (uid){
//   var ref = firebase.database().ref().child('events/' + eventID + '/athletes/' + uid);
//   var acts = $firebaseObject(ref);

// acts.$loaded().then(function() {

//      angular.forEach(acts.activities, function(value, key) {
  
//           $scope.fbActivities.push(value);
//      });



//     }); // end obj.$loaded()

// };

// $scope.upload = function(y) {
//     var fbID = selectedAthlete.athFBId;
//     console.log(fbID)
//     var newObj = firebase.database().ref().child('users/' + fbID + '/activities/').push();
//     var newActivity = {
//       athlete : $scope.recents[y].athlete,
//       distance : $scope.recents[y].distance,
//       elapsed_time : $scope.recents[y].elapsed_time,
//       id : $scope.recents[y].id,
//       map : $scope.recents[y].map,
//       moving_time: $scope.recents[y].moving_time,
//       name: $scope.recents[y].name,
//       start_date: $scope.recents[y].start_date,
//       timezone: $scope.recents[y].timezone,
//       type: $scope.recents[y].type,
//       total_elevation_gain: $scope.recents[y].total_elevation_gain
//     };
//     newObj.set(newActivity)
//     console.log(newObj.value);
// };

}); // end example controller
