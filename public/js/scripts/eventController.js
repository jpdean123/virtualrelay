app.controller('EventCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {

var eventID = $routeParams.eventid;
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

$scope.joinEvent = function (){
  //console.log($scope.user);
  var id = $scope.user.uid;

  $scope.data.athletes[id] = id;

   $timeout( function(){
              $route.reload();
        }, 2000 );

};

$scope.alreadyJoined = true;

function checkJoined (){
  var check = 0;
  var id = $scope.user.uid;

if($scope.data.athletes[id]) {
  
} else {
  $scope.alreadyJoined = false;
}
}



$scope.allowedTypes = [];
$scope.athletes = [];
var ref = firebase.database().ref().child('events/' + eventID);
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



// ALL BELOW IS FOR THE MAP - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
$scope.map = { 
  center: { latitude: 39.8333333, longitude: -98.585522 }, 
  zoom: 4
};


$scope.options = {
  scrollwheel: false
};

$scope.polylines = [];
$scope.polygons = [];

$scope.visible = true;


$scope.markers = [];

$scope.currentPosition;

$scope.changeCenter = function () {
  var coords = { latitude: 40.28932431023776, longitude: -90.8299551878756 };
  $scope.map.center = coords;
 // console.log(coords);
  $scope.map.zoom = 12;
 // console.log('got to the change coords function');
};

function createMap (p,d,c) {

uiGmapGoogleMapApi.then(function(maps) {

      var rawLine = p;
      var line = maps.geometry.encoding.decodePath(rawLine);
    //  console.log(line);

     var distanceFromStart = $scope.totalData.distance;
     var distance_miles = math.unit(distanceFromStart, 'mi');
     var distance_meters = math.number(distance_miles,'m');
   // console.log(distance_meters);


       var polyline = new google.maps.Polyline({
             path: line,
             geodesic: true,
             strokeColor: '#5589ca',
             strokeOpacity: 1.0,
             strokeWeight: 2
           });

    var polyLengthInMeters = maps.geometry.spherical.computeLength(polyline.getPath().getArray());
   // console.log(polyLengthInMeters);
    var currentCoordinates;
      var singlemarker = {
    id: 0,
    icon: 'css/icons_blue/jogging.png',
    legend: 'Current Location',
   };
    CalculatorService.getDistanceFromStart(distance_meters, line).then(function(r){
         //console.log(currentCoordinates);
    currentCoordinates = r;
    $scope.currentPosition = currentCoordinates;
  

     var lineSymbol = {
        path: maps.SymbolPath.FORWARD_CLOSED_ARROW
      };

      singlemarker.coords = currentCoordinates;
    });
 
   

  // console.log(line[0].lat());
   
   var startMarker = {
    id: 1,
    coords: {
      latitude: line[0].lat(),
      longitude: line[0].lng()
    },
    icon: 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_green.png',
    legend: 'Start Line'
   };
 

   var endMarker = {
    id: 2,
    coords: {
      latitude: line[line.length-1].lat(),
      longitude: line[line.length-1].lng()
    },
    icon: 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red.png',
    legend: 'Finish Line'
   };


   // create marker for the pace
    var start = moment($scope.data.start_date);
    var end = moment($scope.data.end_date);
    var now = moment();

    var elapsedDays = now.diff(start, "days");
    var totalDays = end.diff(start, "days");

    var goalMeters_daily = ($scope.data.distance / totalDays) * elapsedDays;
    var goalCoordinates_daily;
    CalculatorService.getDistanceFromStart(goalMeters_daily, line).then(function(r){
      goalCoordinates_daily = r;
      completeMap();
    });


function completeMap (){
    var paceMarker = {
          id: 3,
          coords: goalCoordinates_daily,
          icon: 'css/icons_white/jogging.png',
          legend: 'Pace Marker'
         };




   getReadableLocation(currentCoordinates)
   .then(function(d){
      singlemarker['readable'] = d;
        getReadableLocation(startMarker.coords)
        .then(function(s){
           startMarker['readable'] = s;
              getReadableLocation(endMarker.coords)
              .then(function(m){
                endMarker['readable'] = m;
                    getReadableLocation(paceMarker.coords)
                    .then(function(p){
                      paceMarker['readable'] = p;
                    })
              })
        })
   });



   //console.log(startMarker);
   



      var singleLine = {
                      id: 1,
                      path: line,
                      stroke: {
                          color: '#6060FB',
                          weight: 4 
                      },
                      editable: false,
                      draggable: false,
                      geodesic: false,
                      visible: $scope.visible,
                      static: true
                  };
      $scope.polylines.push(singleLine);


    $scope.markers[0] = startMarker;
    $scope.markers[1] = endMarker;
    $scope.markers[2] = singlemarker;
    $scope.markers[3] = paceMarker;
}

   

 

    }).then(function(){
       $timeout( function(){
            //console.log('got to timeout function and it ran');
            var l = {
              latitude: $scope.currentPosition.latitude,
              longitude: $scope.currentPosition.longitude
            };

            $scope.map = {
              center: l,
              zoom: 9
            };

        }, 1000 );
    }); // end google maps loader
  
}; // end create map function


function getReadableLocation(coords) {
  console.log(coords);
    var baseURL = 'https://maps.googleapis.com/maps/api/geocode/json';
    var key = 'AIzaSyDUEvmx4SYccJerkf5e8mUEE7zEMWfiM1M';

   var deferred = $q.defer();
   var latlng = coords.latitude + ',' + coords.longitude;
    var fullURL = baseURL
                + '?latlng=' + latlng 
                + '&key=' + key
                + '&result_type=political';

   $http({
      url: fullURL,
      method: "POST"
  })
    .then(function(response) {
      //console.log(response);
      if (response.data.results.length > 0) {

        var addr = response.data.results[0].formatted_address;
        deferred.resolve(addr)
      } else {
        deferred.resolve('Somewhere, World');
      }
    }, 
    function(response) { // optional
      console.log(response);   
      deferred.reject();
  });
    return deferred.promise
};


// charting

function createChart (){
   

  $scope.unusedActivities = $scope.activities;
  for (var i = 0; i < $scope.unusedActivities.length; i++) {
    $scope.unusedActivities[i]['used'] = false;
  };
    $scope.labels = [];

    $scope.series = ['Goal', 'Actual', 'Difference'];
    $scope.chartdata = [[],[],[]];


    //find daily average
   // console.log($scope.data);
    var start = moment($scope.data.start_date);
    var end = moment($scope.data.end_date);
    var now = moment();

    var daysRemaining = end.diff(now, "days");
    var elapsedDays = now.diff(start, "days");
    var elapsedWeeks = now.diff(start, 'weeks') + 1;
   // console.log(elapsedWeeks);
    var totalDays = end.diff(start, "days");
    var totalWeeks = totalDays / 7;
    var totalMeters = math.unit($scope.data.distance, 'm');
    var totalMiles = math.number(totalMeters, 'mi');

    var milesPerDay = totalMiles / totalDays;

    var milesPerWeek = totalMiles / totalWeeks;

    var cumulativeMiles = 0;

    var cumulativeActivities = 0;
     console.log('here are all the activities    ' + $scope.activities.length);

    for (var i = 0; i <= elapsedDays; i++) {
      var s = {};
      var s = start;

      
      var day;
      if( i === 0) {
        day = s.add(0, 'd');
      } else {
        day = s.add(1, 'd');
      }
      
      var readable = day.format("D MMM YYYY"); 

      $scope.labels.push(readable);

      var daily = i * milesPerDay;
      $scope.chartdata[0].push(parseFloat(daily.toFixed(1)));


       var m = s.clone();
       var off = m.utcOffset();
       m.subtract(off,'m');
       m.tz('America/Los_Angeles');

      var rangeEnd = m.clone();
     

      var rangeStart = m.clone().subtract(1, 'd');
     
      //console.log('range start = ' + rangeStart.format('D MM YYYY') + '  and the range end is =  ' + rangeEnd.format('D MM YYYY'));
      for (var x = 0; x < $scope.activities.length; x++) {
        var actDate = moment($scope.activities[x].ended_at);

        if (actDate > rangeStart && actDate <= rangeEnd) {
          
          $scope.unusedActivities[x]['used'] = true;
          var meters = math.unit($scope.activities[x].distance, 'm');
          var miles = parseFloat(math.number(meters, 'mi'));
        
          
          cumulativeMiles = cumulativeMiles + miles;
          cumulativeActivities = cumulativeActivities + 1;

            if (i == elapsedDays) {
                  console.log('the start date - ' + rangeStart.format("YYYY MM DD H:mm:ss a Z") + ' end date ---- ' + rangeEnd.format("YYYY MM DD H:mm:ss a Z"));
              }

        } else {
          //console.log('this activity did not work' + $scope.activities[x]);
        }
      } 

      var prettyCumulative = cumulativeMiles.toFixed(1);
      $scope.chartdata[1].push(prettyCumulative);
      var difference = cumulativeMiles - daily;
      var prettyDifference = difference.toFixed(1);
      $scope.chartdata[2].push(prettyDifference);
      

    };  


$scope.chartcolors = ['#949FB1','#46BFBD', '#FDB45C'];

      $scope.onClick = function (points, evt) {
        //console.log(points, evt);
      };
      $scope.datasetOverride = [
        { 
          yAxisID: 'y-axis-1',
          type: 'line'

        }, 
        { 
          xAxisID: 'x-axis-1' ,
          type: 'line'
        },
        {
          yAxisID: 'y-axis-1',
          borderWidth: 1,
          type: 'bar'
        }
      ];


      $scope.options = {
        scales: {
          yAxes: [
            {
              id: 'y-axis-1',
              type: 'linear',
              display: true,
              position: 'left',
              scaleLabel: {
                display: true,
                labelString: 'Miles'
              }
            }
          ],
           xAxes: [
            {
              id: 'x-axis-1',
              display: true,
              scaleLabel: {
                display: true,
                labelString: 'By Day'
              }
            }
          ]
        },
        legend: {
            display: true,
            position: 'bottom'
        }
      };

};

var fireChats = fire.ref().child('chats/' + eventID);
var chats = $firebaseArray(fireChats);

  // to take an action after the data loads, use the $loaded() promise
     chats.$loaded().then(function() {
      //  console.log('chats got loaded');
     
    }); // end obj.$loaded()

     $scope.chats = chats;


     $scope.$watch('chats', function() {
     // console.log('watch saw a change in the chats');
    });


function processChats () {
     angular.forEach(chats, function(value, key) {
         chats[key].time_relative = moment(value.date).fromNow();
         
          var ownerID = chats[key].owner;
          var athlete = $scope.data.athletes[ownerID].athlete;
          var stravaUserId = athlete.id;
          if (athlete.profile.includes('avatar')) {
            $scope.chats[key].profile = 'https://www.strava.com/athletes/' + stravaUserId + '/avatar?size=large';
          } else {
            $scope.chats[key].profile = athlete.profile;
          }
          
          $scope.chats[key].name = athlete.firstname + " " + athlete.lastname;
       });
};

$scope.sendChat = function (){

  var msgText = $scope.newchat;
  var msgTimestamp = moment().format();

  var chatMsg = {
    text: msgText,
    date: msgTimestamp,
    owner: $scope.user.friendlyID
  };

   chats.$add(chatMsg).then(function(ref) {
    var id = ref.key;
    //console.log("added record with id " + id);
    chats.$indexFor(id); // returns location in the array
    processChats();
  });
   $scope.newchat = '';
};



  $scope.hoverIn = function(){
        this.hoverEdit = true;
    };

    $scope.hoverOut = function(){
        this.hoverEdit = false;
    };



}); // end example controller
