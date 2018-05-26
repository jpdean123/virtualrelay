app.controller("CreateCtrl",
  function($scope, $q, $location, $http, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, $timeout, StravaService) {

var fire = firebase.database();
$scope.user = UserService.getCurrentUser();
var users = fire.ref('users');
var query = users.orderByChild('owner').equalTo($scope.user.uid);

$scope.$watch('user', function(){
  query.once('value', function(snap){
      var k = Object.keys(snap.val())[0];
      if (snap.val()) {} else {$route.reload()}
     //console.log(k);
      $scope.user.friendlyID = k;
      $scope.newEvent.admin_user = k;
      $scope.newEvent.athletes[k] = snap.val()[k];
      //$scope.newEvent.athletes[k].activities = {};
      $scope.user.strava_token = snap.val()[k].strava_token;
      pullRoutes(snap.val()[k].strava_token, snap.val()[k].athlete.id);
    });
});

$scope.$watch('newEvent.start_date', function(){
  var addDays = parseInt($scope.newEvent.days);
  var m = moment($scope.newEvent.start_date);
  var n = m.add(addDays, 'days');
  $scope.newEvent.end_date = n.format();
  $scope.newEvent.start_date = moment($scope.newEvent.start_date).format();
})
    
// scope variable for the form 
$scope.step = 1;
$scope.next_disabled = true;

$scope.newEvent = {
  title: "",
  description: "",
  distance: 0,
  people_count: 10,
  path: "",
  cost: 0,
  admin_user: "",
  athletes: {}
};

$scope.today = function() {
    $scope.dt = new Date();
  };
  $scope.today();

  $scope.clear = function() {
    $scope.dt = null;
  };

$scope.eventStepClasses = ['step-active', 'step-inactive', 'step-inactive', 'step-inactive'];
    // basic steps
          // form in the view for some data
          // render a map to create path variable
          // search for users to add athletes & or add email addresses




  // google maps stuff
  $scope.markers = [];
  //push only first and last marker to the map
  //apend existing polyline with total polyline

  $scope.pointsArray = [];
  $scope.polylines = [{
                      id: 1,
                      path: "",
                      stroke: {
                          color: '#6060FB',
                          weight: 4 
                      },
                      editable: false,
                      draggable: false,
                      geodesic: false,
                      visible: $scope.visible,
                      static: true
                  }];

     $scope.map = {
      center: {
        latitude: 42.324666380272916,
        longitude: -83.60940366983414
      },
      zoom: 4,
      bounds: {},
      events: {
        click: function(mapModel, eventName, originalEventArgs) {
            
              processEventData(mapModel, eventName, originalEventArgs);
            
             
             }
             
        }
       } // end $scope.map
    $scope.options = {
      scrollwheel: false
    };


processEventData = function(mapModel, eventName, originalEventArgs) {
uiGmapGoogleMapApi.then(function(maps) {
        var service = new google.maps.DirectionsService();
 
        var e = originalEventArgs[0];
            //console.log(e.latLng);
            var result = {
                latitude: e.latLng.lat(),
                longitude: e.latLng.lng()
              };
            var nextID = $scope.markers.length;
            var singlemarker = {
                  id: nextID,
                  coords: result
            
                 };

            if ($scope.pointsArray.length === 0) {
              $scope.markers.push(singlemarker);
              $scope.pointsArray.push(e.latLng);
              //$scope.polyline.path = maps.geometry.encoding.encodePath($scope.pointsArray);
            } else {
              $scope.markers[1] = singlemarker;
              var lastPoint = $scope.pointsArray.length - 1;
              service.route({
                origin: $scope.pointsArray[lastPoint],
                destination: e.latLng,
                travelMode: google.maps.DirectionsTravelMode.DRIVING
              }, function(result, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                  for (var i = 0, len = result.routes[0].overview_path.length;
                      i < len; i++) {
                    $scope.pointsArray.push(result.routes[0].overview_path[i]);
                    
                  }
                  $scope.polylines[0].path = $scope.pointsArray;
                  var distance_meters = math.unit(maps.geometry.spherical.computeLength($scope.polylines[0].path), 'm');
                  $scope.newEvent.distance = math.number(distance_meters, 'mi');
                  $scope.encodedPath = maps.geometry.encoding.encodePath($scope.pointsArray);
                  $scope.$apply();
                }
                else {
                  $scope.pointsArray.push(e.latLng);
                  $scope.polylines[0].path=$scope.pointsArray;
                  var distance_meters = math.unit(maps.geometry.spherical.computeLength($scope.polylines[0].path), 'm');
                  $scope.newEvent.distance = math.number(distance_meters, 'mi');
                  $scope.encodedPath = maps.geometry.encoding.encodePath($scope.pointsArray);
                  $scope.$apply();
                  // add some handling for when the status === "ZERO_RESULTS" then you simply add the new point and put the path between them
                  // i think you just have to push the new point to the pointsArray 
                  console.log(result);
                  console.log(status);
                }
              });
            }
   });
};


createMap = function() {
  uiGmapGoogleMapApi.then(function(maps) {
            // nothing to do here at the moment, render the map using this function and then the user 
            //impocts the drawing on the amp


        //   var fromDirections = "}ktwF|`ubMp@b@iBxF}BjHmEuCaDuBgFiDaEkCuDcCwNmJwFsDwBqAkBoAg@a@}EeD_SoM~DcMNe@^iAf@^@F@DbC`BLLDL@d@IVSt@GPIJOBMCIG}@}Aq@cAWYOKIEWEY?UDYJi@\]^KRoDfHu@bB{@hCg@dBQ`AU~A_ChH_D|J_AzCc@rAwXl|@{Lv_@k@hCUrBAvABn@LnALn@FRX~@Td@Z`@Z^hAx@x@r@`BlAr@d@|B~@b@HTLt@b@hA|@ZHd@@`@Gl@Uh@g@\s@Nw@B_AGy@Ss@Wi@c@a@c@YwAk@wHoCYIqEs@}ACe@Dc@J]L[Nm@l@UXe@`AgJbXcBlFmB|Gy@dC{D`KuBrFyC|HaAxC{E`Ri@vBeB~GaCdJ{@~Ck@bBe@~@W`@[^[b@gAjA{DxDmA|@qBdA_@XkAd@cBj@}Ab@iB\{Dz@yCl@yA\mE`A}Aj@qCjAuC~AkBnA_@ZcBxAoApA{BhCoBtCwJpOo@~@YZo@hA{BpDoCfE_DbFyGbKaI`MgJ`N_HhKiE|GkL|PsAzBSBEBYT}@j@iA`@e@J_ADgCHeGJyA?u@CiBUaEkAiC}@wCoAiCsAyCkBgEaDsBeBq@m@kHgG}@y@mBaBa@_@G_@?MF]XOzEkBxD{AXKvAi@^^PVXZZlGN|DCb@Id@u@zAkApCu@fBi@tAxAdA~D`DzBnBbChB`@X";
        //  var smallOne = "epiaGfwh}NrjC_tH";
        //   var examplePath = maps.geometry.encoding.decodePath(fromDirections);
        //  console.log(examplePath);
        //   var exampleLine = {
        //               id: 1,
        //               path: examplePath,
        //               stroke: {
        //                   color: '#6060FB',
        //                   weight: 4 
        //               },
        //               editable: false,
        //               draggable: false,
        //               geodesic: false,
        //               visible: $scope.visible,
        //               static: true
        //           };

        // $scope.polylines.push(exampleLine);
    })
};

createMap();
    


$scope.undo = function(){

};

 
function pullRoutes (t, i){
  var bearer = 'Bearer ' + t;
  $http({
        url: 'https://www.strava.com/api/v3/athletes/' + i + '/routes',
        method: "GET",
        headers: {
                 'Authorization': bearer
               }
    })
    .then(function(response) {
      console.log(response);
           $scope.routesArray = response.data;
            $scope.selected = { value: $scope.routesArray[0] };
    }, 
    function(response) { // optional
            console.log(response);
    });
};

$scope.selectedRoute;

$scope.$watch('selectedRoute', function(){
  var routeMeters = math.unit($scope.selectedRoute.distance, 'm');    
  $scope.goalMiles = math.number(routeMeters, 'mi'); 
  $scope.newEvent.distance = $scope.selectedRoute.distance;
  $scope.newEvent.path ='';

});


$scope.$watch('newEvent.days', function(){
  if ($scope.newEvent.days == 3) {
    $scope.newEvent.cost = 25
  } if ($scope.newEvent.days == 7) {
    $scope.newEvent.cost = 50
  } if ($scope.newEvent.days == 30) {
    $scope.newEvent.cost = 100
  } if ($scope.newEvent.days == 365) {
    $scope.newEvent.cost = 150
  }

  if ($scope.newEvent.days) {
   $scope.next_disabled = false;
  }
})

$scope.$watch('step', function(){
  if ($scope.step == 2) {
   $scope.eventStepClasses[0] = 'step-complete';
   $scope.eventStepClasses[1] = 'step-active';
  }
  if ($scope.step == 3) {
    var bearer = 'Bearer ' + $scope.user.strava_token;
    $http({
        url: 'https://www.strava.com/api/v3/routes/' + $scope.selectedRoute.id,
        method: "GET",
        headers: {
                 'Authorization': bearer
               }
    })
    .then(function(response) {
      console.log(response);
           $scope.newEvent.path = response.data.map.polyline;
           $scope.eventStepClasses[1] = 'step-complete';
           $scope.eventStepClasses[2] = 'step-active';

    }, 
    function(response) { // optional
            console.log(response);
    });
  }
  if ($scope.step == 4) {
    createEvent();
    $scope.eventStepClasses[2] = 'step-complete';
    $scope.eventStepClasses[3] = 'step-active';
  }
})
  



function createEvent (){
   var newObj = fire.ref().child('events').push();
   var newKey = newObj.key;

  newObj.set($scope.newEvent);

  fire.ref().child('userEvents/' + $scope.user.friendlyID + "/" + newKey).set({
    title: $scope.newEvent.title
  });

$scope.sharelink = "http://localhost:5000/#/signup?invite=" + newKey;


}






  }); // end create controller 