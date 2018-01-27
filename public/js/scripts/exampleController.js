app.controller('ExampleCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, StravaService) {

var eventID = $routeParams.eventid;
var fire = firebase.database();
$scope.user = UserService.getCurrentUser();

$scope.joinEvent = function (){
  console.log($scope.user);
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
        console.log("loaded record:", obj.$id);

        initProcessing(obj);

       

       

       //
     

    }); // end obj.$loaded()

    // To make the data available in the DOM, assign it to $scope
     $scope.data = obj;

     // For three-way data bindings, bind it to the scope instead
     obj.$bindTo($scope, "data");


function initProcessing(event){
  processTiming(event.start_date, event.end_date);
  processTypes(event.allowed_types);
  processSummaryDistance(event.distance);
  processAthletes(event.athletes).then(function(data){
    createMap($scope.data.path, $scope.data.distance,$scope.totalData.distance);
    createChart();
  });
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

    // add total time to totalData object
    $scope.totalData.totalTime = $scope.totalData.totalTime + list[i].moving_time;
    $scope.totalData.totalTime_pretty = moment.duration($scope.totalData.totalTime, 'seconds').format('dd:hh:mm');


  // process timing
    tempActivity.start_date_pretty = moment(tempActivity.start_date).fromNow();
    tempActivity.time_pretty = moment.duration(list[i].moving_time, 'seconds').format("hh:mm:ss");
    var milisecondsPerMile = (list[i].moving_time * 1000) / distanceMiles;
    tempActivity.pace = moment.utc(milisecondsPerMile).format("mm:ss");



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
  console.log(coords);
  $scope.map.zoom = 12;
  console.log('got to the change coords function');
};

function createMap (p,d,c) {

uiGmapGoogleMapApi.then(function(maps) {

      var rawLine = p;
      var line = maps.geometry.encoding.decodePath(rawLine);
      console.log(line);

     var distanceFromStart = $scope.totalData.distance;
     var distance_miles = math.unit(distanceFromStart, 'mi');
     var distance_meters = math.number(distance_miles,'m');
    console.log(distance_meters);


       var polyline = new google.maps.Polyline({
             path: line,
             geodesic: true,
             strokeColor: '#5589ca',
             strokeOpacity: 1.0,
             strokeWeight: 2
           });

    var polyLengthInMeters = maps.geometry.spherical.computeLength(polyline.getPath().getArray());
    console.log(polyLengthInMeters);
    var currentCoordinates = CalculatorService.getDistanceFromStart(distance_meters, line);
    console.log(currentCoordinates);
    $scope.currentPosition = currentCoordinates;
    
      //var decoded = polyline.decode(rawLine);
     //var currentLocation = (c/ d) * 100 + "%";
     //console.log(currentLocation);

     var lineSymbol = {
        path: maps.SymbolPath.FORWARD_CLOSED_ARROW
      };

   var singlemarker = {
    id: 0,
    coords: currentCoordinates,
    icon: 'css/icons_blue/jogging.png'
   };

   console.log(line[0].lat());
   
   var startMarker = {
    id: 1,
    coords: {
      latitude: line[0].lat(),
      longitude: line[0].lng()
    },
    icon: 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_green.png'
   };
   var endMarker = {
    id: 2,
    coords: {
      latitude: line[line.length-1].lat(),
      longitude: line[line.length-1].lng()
    }
   };


   //console.log(startMarker);
   $scope.markers.push(startMarker);
   $scope.markers.push(endMarker);



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


    $scope.markers.push(singlemarker);
 

    }).then(function(){
       $timeout( function(){
            console.log('got to timeout function and it ran');
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

// charting

function createChart (){
   


    $scope.labels = [];

    $scope.series = ['Goal', 'Actual', 'Difference'];
    $scope.chartdata = [[],[],[]];


    //find daily average
    console.log($scope.data);
    var start = moment($scope.data.start_date);
    var end = moment($scope.data.end_date);
    var now = moment();

    var daysRemaining = end.diff(now, "days");
    var elapsedDays = now.diff(start, "days");
    var elapsedWeeks = now.diff(start, 'weeks') + 1;
    console.log(elapsedWeeks);
    var totalDays = end.diff(start, "days");
    var totalWeeks = totalDays / 7;
    var totalMeters = math.unit($scope.data.distance, 'm');
    var totalMiles = math.number(totalMeters, 'mi');

    var milesPerWeek = totalMiles / totalWeeks;

    var cumulativeMiles = 0;


    for (var i = 0; i <= elapsedWeeks; i++) {
      var s = {};
      var s = start;

      
      var day;
      if( i === 0) {
        day = s.add(0, 'w');
      } else {
        day = s.add(1, 'w');
      }
      
      var readable = day.format("D MMM YYYY"); 

      $scope.labels.push(readable);

      var weekly = i * milesPerWeek;
      $scope.chartdata[0].push(parseFloat(weekly.toFixed(1)));

      var rangeEnd = s.clone();
     

      var rangeStart = s.clone().subtract(1, 'w');
     
      //console.log('range start = ' + rangeStart.format('D MM YYYY') + '  and the range end is =  ' + rangeEnd.format('D MM YYYY'));
      for (var x = 0; x < $scope.activities.length; x++) {
        var actDate = moment($scope.activities[x].start_date);
        if (actDate > rangeStart && actDate <= rangeEnd) {
          
          var meters = math.unit($scope.activities[x].distance, 'm');
          var miles = parseFloat(math.number(meters, 'mi').toFixed(1));
        
          
          cumulativeMiles = cumulativeMiles + miles;

        }
      }

      var prettyCumulative = cumulativeMiles.toFixed(1);
      $scope.chartdata[1].push(prettyCumulative);
      var difference = cumulativeMiles - weekly;
      var prettyDifference = difference.toFixed(1);
      $scope.chartdata[2].push(prettyDifference);
      

    };  


$scope.chartcolors = ['#949FB1','#46BFBD', '#FDB45C'];

      $scope.onClick = function (points, evt) {
        console.log(points, evt);
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
                labelString: 'Week Ending'
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



}); // end example controller
