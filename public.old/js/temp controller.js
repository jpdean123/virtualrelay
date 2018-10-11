app.controller("CreateCtrl",
  function($scope, $q, $location, $http, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, $timeout, StravaService) {

    // basic steps
          // form in the view for some data
          // render a map to create path variable
          // search for users to add athletes & or add email addresses


  // google maps stuff
  $scope.markers = [];
  var allPoints = [];
  //push only first and last marker to the map
  $scope.polylines = [];
  //apend existing polyline with total polyline


     $scope.map = {
      center: {
        latitude: 42.324666380272916,
        longitude: -83.60940366983414
      },
      zoom: 14,
      bounds: {},
      events: {
        click: function(mapModel, eventName, originalEventArgs) {
            var e = originalEventArgs[0];
            var result = {
                latitude: e.latLng.lat(),
                longitude: e.latLng.lng()
              };
            var nextID = $scope.markers.length;
            var singlemarker = {
                  id: nextID,
                  coords: result
            
                 };
            
            allPoints.push(result);

            if (nextID == 0) {
              $scope.markers.push(singlemarker);
              $scope.$apply();
            } else { 
            $scope.markers[1] = singlemarker;
             getRoadPath().then(function(res){
              console.log(res);

              var singleLine = {
                      id: 1,
                      path: res,
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
                $scope.polylines[0] = singleLine;
                //$scope.$apply();
             
             });
             
            };
            
            

       }
      }
    };
    $scope.options = {
      scrollwheel: false
    };


getRoadPath = function () {
  var deferred = $q.defer();
uiGmapGoogleMapApi.then(function(maps) {


//https://developers.google.com/maps/documentation/javascript/directions#TravelModes

var start = new google.maps.LatLng({lat: allPoints[$scope.markers.length-2].latitude,
                                    lng: allPoints[$scope.markers.length-2].longitude           
                                  });
var end = new google.maps.LatLng({lat: allPoints[$scope.markers.length-1].latitude,
                                    lng: allPoints[$scope.markers.length-1].longitude           
                                  });

var fullURL = "https://maps.googleapis.com/maps/api/directions/json?origin="
             + start 
             + "&destination=" 
             + end 
             + "&key=AIzaSyDUEvmx4SYccJerkf5e8mUEE7zEMWfiM1M";


var testURL = "https://maps.googleapis.com/maps/api/directions/json?origin=75+9th+Ave+New+York,+NY&destination=MetLife+Stadium+1+MetLife+Stadium+Dr+East+Rutherford,+NJ+07073"
              + "&key=AIzaSyDUEvmx4SYccJerkf5e8mUEE7zEMWfiM1M";


    $http({
        method: 'POST',
        url: testURL
      }).then(function successCallback(response) {
        console.log(response);
        $scope.example = response;
        deferred.resolve(maps.geometry.encoding.decodePath(response.data.routes[0].overview_polyline.points));
          // this callback will be called asynchronously
          // when the response is available
        }, function errorCallback(response) {
            console.log('error man');
            console.log(response);
          // called asynchronously if an error occurs
          // or server returns response with an error status.
        });

    }); // end google maps function ------------

      return deferred.promise
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
    






  }); // end create controller 
