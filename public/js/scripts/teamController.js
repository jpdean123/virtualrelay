app.controller('TeamCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {

var teamID = $routeParams.teamid;
var fire = firebase.database();
$scope.user = UserService.getCurrentUser();

var users = fire.ref('users');
var query = users.orderByChild('owner').equalTo($scope.user.uid);

    query.once('value', function(snap){
      var k = Object.keys(snap.val())[0];
     // console.log(k);
      $scope.user.friendlyID = k;
      user = snap.val();

    });

var ref = firebase.database().ref().child('teams/' + teamID);
var obj = $firebaseObject(ref);

     // to take an action after the data loads, use the $loaded() promise
     obj.$loaded().then(function() {

      //  console.log('object got loaded');
        //initProcessing(obj);
     

    }); // end obj.$loaded()

    // To make the data available in the DOM, assign it to $scope
     //$scope.data = obj;

     // For three-way data bindings, bind it to the scope instead
     obj.$bindTo($scope, "data");
     console.log(obj);
     $scope.$watch('data', function() {
     // console.log('watch saw a change');
        initProcessing(obj);
    });


function initProcessing(event){



  if (event.distance) {

    $scope.allowedTypes = [];
    $scope.athletes = [];
    $scope.totalData = {
        distance : 0,
        elevation_gain : 0,
        totalTime: 0
      };

  $scope.athleteCount = 0;
  $scope.activities = [];
    processTiming(event.start_date, event.end_date);
    processTypes(event.allowed_types);
    processSummaryDistance(event.distance);
    processAthletes(event.athletes).then(function(data){
      //createMap($scope.data.path, $scope.data.distance,$scope.totalData.distance);
      //createChart();
      //processChats();
     
    });
    
  };
  
  
};


function processTiming (s,e) {
         var end = moment(e);
        var start = moment(s);
        var now = moment();

        $scope.remaining = end.diff(now, "days");
        $scope.elapsedDays = now.diff(start, "days");
};

function processTypes (t) {
  // To iterate the key/value pairs of the object, use angular.forEach()
       angular.forEach(t, function(value, key) {
          $scope.allowedTypes.push(value);
       });
};

function processSummaryDistance (d) {
        var goalMeters = math.unit(d, 'm');    
        $scope.goalMiles = math.number(goalMeters, 'mi');
        // $scope.slider.min = $scope.data.summary.total_distance_miles;
        // $scope.slider.options.ceil = $scope.goalMiles;
        // $scope.slider.options.floor= 0;

    var start = moment($scope.data.start_date);
    var end = moment($scope.data.end_date);
    var now = moment();

    var elapsedDays = now.diff(start, "days");
    var totalDays = end.diff(start, "days");

    // var goalMeters_daily = ($scope.data.distance / totalDays) * elapsedDays;
    // var pacerMeters = math.unit(goalMeters_daily, 'm');
    // var pacerMiles = math.number(pacerMeters, 'mi');
   //$scope.slider.max = pacerMiles;

};

// DOM variables

$scope.totalData = {
      distance : 0,
      elevation_gain : 0,
      totalTime: 0
    };

$scope.athleteCount = 0;
$scope.activities = [];





function processAthletes (athObj) {
  //count number of athletes:

  var promises = [];
    angular.forEach(athObj, function(value, key) {
      var pr = function() {
         var deferred = $q.defer();
          $scope.athleteCount = $scope.athleteCount +1 ;
          var finished = processData(value);
          deferred.resolve(finished);
          }
        promises.push(pr());
       });

  return $q.all(promises)
};




function processData (d) {
   checkJoined(); 
  // add athlete information to each activity
  //console.log(a);
  //console.log(d);
  var list = [];

  angular.forEach(d.activities, function(v,k){
      list.push(v);
  });


  var tempAthlete = d.athlete;
  tempAthlete.totalDistance = 0;
  tempAthlete.totalTime = 0;
  tempAthlete.elevation_gained = 0;
  tempAthlete.averagePace = 0;
  totalTime_pretty = '',
  tempAthlete.name_pretty = d.athlete.firstname + " " + d.athlete.lastname.charAt(0) + ".";
  tempAthlete.count = 0;
  if (d.athlete.profile_medium.includes('avatar')) {
    tempAthlete.profile_medium = 'https://www.strava.com/athletes/' + tempAthlete.id + '/avatar?size=medium'
  };

  for (var i = 0; i < list.length; i++) {

  // first need to filter so that only the correct activity types are processed, also check that start time is between start/end times of event
  if ($scope.allowedTypes.indexOf(list[i].type) > -1 && moment(list[i].start_date) > moment($scope.data.start_date) && moment(list[i].start_date) < moment($scope.data.end_date)) {

    tempAthlete.count = tempAthlete.count +1;
    // create a temporary activity object
    var tempActivity = list[i];
    tempActivity.a = d.athlete;
    tempActivity.a.name_pretty = d.athlete.firstname + " " + d.athlete.lastname.charAt(0) + ".";

  // process the distances  
    var distanceM = math.unit(list[i].distance, 'm');
    var distanceMiles = math.number(distanceM, 'mi');
    tempActivity.distance_miles = distanceMiles;

    //add distance to totaldata object
    $scope.totalData.distance = $scope.totalData.distance + distanceMiles;

    // add elevation to totalData object
    var el_gain_meters = list[i].total_elevation_gain;
    var el_gain_ft = math.unit(el_gain_meters, 'm').toNumber('ft');
    $scope.totalData.elevation_gain = $scope.totalData.elevation_gain + el_gain_ft;
    tempActivity.elevation_gain = el_gain_ft;

    // add total time to totalData object
    $scope.totalData.totalTime = $scope.totalData.totalTime + list[i].moving_time;
    $scope.totalData.totalTime_pretty = moment.duration($scope.totalData.totalTime, 'seconds').format('dd:hh:mm');


  // process timing
    tempActivity.start_date_pretty = moment(tempActivity.start_date).fromNow();
    tempActivity.time_pretty = moment.duration(list[i].moving_time, 'seconds').format("hh:mm:ss");
    var milisecondsPerMile = (list[i].moving_time * 1000) / distanceMiles;
    tempActivity.pace = moment.utc(milisecondsPerMile).format("mm:ss");

    //parsing timezones on the start date
   var str = tempActivity.timezone;
   var split = str.split(" ")[1];

   var m = moment(tempActivity.start_date).tz(split);
   var off = m.utcOffset();
   m.subtract(off,'m');
   m.tz('America/Los_Angeles');
   tempActivity.ended_at = m.add(list[i].moving_time, 's');
   var p = m.clone();
   tempActivity.ended_at_pretty  = p.fromNow();
 
  // push single activity to DOM  
    $scope.activities.push(tempActivity);


  // Process activities to the athlete
    tempAthlete.totalDistance = tempAthlete.totalDistance + distanceMiles;
    tempAthlete.totalTime = tempAthlete.totalTime + list[i].moving_time;
    tempAthlete.totalTime_pretty = moment.duration(tempAthlete.totalTime,'seconds').format('hh:mm');
    tempAthlete.elevation_gained = tempAthlete.elevation_gained + el_gain_ft;


    tempAthlete.averagePace = moment.duration(tempAthlete.totalTime / tempAthlete.totalDistance, 'seconds').format('hh:mm:ss');
    //console.log(tempAthlete.distance);
    // process name of athlete 


  } else {
    // do nothing with the activities that do not qualify
  }


  

  }; // end for loop over list of activities
  
  $scope.athletes.push(tempAthlete);

 
  $scope.totalData.averagePace = moment.duration(($scope.totalData.totalTime / $scope.totalData.distance),'seconds').format('mm:ss');
  return true
};





  $scope.hoverIn = function(){
        this.hoverEdit = true;
    };

    $scope.hoverOut = function(){
        this.hoverEdit = false;
    };



}); // end example controller
