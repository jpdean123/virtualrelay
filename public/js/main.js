/**
 * AngularJS Tutorial 1
 * @author Nick Kaye <nick.c.kaye@gmail.com>
 */

/**
 * Main AngularJS Web Application
 */
var app = angular.module('tutorialWebApp', [
  'firebase',
  'ngRoute',
  'ngAnimate',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'uiGmapgoogle-maps',
  'chart.js'
]);

/**
 * Configure the Routes
 */
app.config(function ($locationProvider, $routeProvider, uiGmapGoogleMapApiProvider) {

  $locationProvider.hashPrefix('');
  $routeProvider
    // Home
    .when("/", {templateUrl: "partials/home.html", controller: "PageCtrl"})
    // Pages
    .when("/about", {templateUrl: "partials/about.html", controller: "PageCtrl"})
    .when("/faq", {templateUrl: "partials/faq.html", controller: "PageCtrl"})
    .when("/pricing", {templateUrl: "partials/pricing.html", controller: "PageCtrl"})
    .when("/eventslist", {templateUrl: "partials/events_list.html", controller: "EventsListCtrl"})
    .when("/map", {templateUrl: "partials/map.html", controller: "MapCtrl"})
    // Blog
    .when("/blog", {templateUrl: "partials/blog.html", controller: "BlogCtrl"})
    .when("/blog/post", {templateUrl: "partials/blog_item.html", controller: "BlogCtrl"})
    // virtual relay stuff
    .when("/signup", {templateUrl: "partials/signup.html", controller: "SignUpCtrl"})
    .when("/dashboard", {templateUrl: "partials/dashboard.html", controller: "DashCtrl"})
    .when("/token_exchange", {templateUrl: "partials/token.html", controller: "TokenCtrl"})
    .when("/event/:eventid", {templateUrl: "partials/event.html", controller: "EventCtrl"})
    .when("/create", {templateUrl: "partials/create.html", controller: "CreateCtrl"})
    // else go to signup / login page... this app will act as the app. with a public Wordpress page to match
    // maybe we can use Bitly API to create short links to the specific events so they don't see the firebase URL
    // do that on event creation and then save it to the event for later
    .otherwise("/signup");

    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyDUEvmx4SYccJerkf5e8mUEE7zEMWfiM1M',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,drawing,geometry,visualization,places,directions'
    });
});



/**
 * Controls the Blog
 */
app.controller('BlogCtrl', function ($scope, $location, $http, $firebaseObject) {
  console.log("Blog Controller reporting for duty.");
});


/**
 * Controls the Footer
 */
// app.controller('FooterCtrl', function ($scope, $location, $http) {
  
//  // firebase.auth().onAuthStateChanged(function(user) {
//  //      if (user) {
//  //         console.log(user.uid);
//  //      } else {
//  //       console.log('no user');
//  //      }
//  //      });


// });





app.controller("FooterCtrl", ["$scope", "$firebaseAuth",
  function($scope, $firebaseAuth) {

  }
]);

app.service('UserService', function ($firebaseAuth, $location, $rootScope){

  var auth = $firebaseAuth();
  

  var currentUser = {
    loggedIn : false,
    email: '',
    uid: ''
  };

  var fUser = auth.$getAuth();

      if (fUser) {
      console.log("Signed in as:", fUser.email);
        currentUser.loggedIn = true;
        currentUser.email = fUser.email;
        currentUser.uid = fUser.uid;

    } else {
      console.log("Signed out");
    };


 auth.$onAuthStateChanged(function(firebaseUser) {
  if (firebaseUser) {
    console.log("Signed in as:", firebaseUser.uid);
    currentUser.loggedIn = true;
    currentUser.email = firebaseUser.email;
    currentUser.uid = firebaseUser.uid;
    //$location.path('dashboard');

  } else {
    console.log("Signed out");
    currentUser.loggedIn = false;
    currentUser.email = "";
    currentUser.uid = "";
    var pathUrl = $location.path();
    var substring = 'event/';
    var publicCheck = pathUrl.indexOf(substring);
    if (publicCheck ==-1) {
      $location.path('/signup');
      $rootScope.$apply();
    }
    
  }
});

  this.getCurrentUser = function() {
      return currentUser;
    
    }

});


app.service('StravaService', function ($firebaseAuth, $location, $rootScope, $http, $q, $timeout){


  this.getStravaActivities = function(ath) {
    
    var promises = [];

    console.log(ath);

    for (var i = 0; i < ath.length; i++) {
            var getActivities = function(){
                var options = {
                       after: 1511834396
                        };
              var b = 'Bearer ' + ath[i].strava_token;
              var deferred = $q.defer();

                $http({
                            url: 'https://www.strava.com/api/v3/athlete/activities',
                            method: "GET",
                            headers: {
                             'Authorization': b
                           },
                            data: options
                        })
                        .then(function(response) {
                          console.log(response);
                          deferred.resolve(response);
                        }, 
                        function(response) { // optional
                          console.log(response);
                          deferred.reject(response);     
                        });
              return deferred.promise;
            };
      promises.push(getActivities());
    };

    
    return $q.all(promises);
  };

}); // end of service


app.service('CalculatorService', function ($firebaseAuth, $location, $rootScope){



  this.getDistanceFromStart = function(metres, encodedLine) {
        // first create a google maps line that we can work with 

        var polyline = new google.maps.Polyline({
             path: encodedLine,
             geodesic: true,
             strokeColor: '#5589ca',
             strokeOpacity: 1.0,
             strokeWeight: 2
           });

        console.log(polyline.getPath().getLength());

    // some awkward special cases
    if (metres == 0) return polyline.getPath().getAt(0);
    if (metres < 0) return null;
    if (polyline.getPath().getLength() < 2) return null;
    var dist = 0;
    var olddist = 0;
    for (var i = 1;
      (i < polyline.getPath().getLength() && dist < metres); i++) {
      olddist = dist;
      dist += google.maps.geometry.spherical.computeDistanceBetween(
        polyline.getPath().getAt(i),
        polyline.getPath().getAt(i - 1)
      );
    }
    if (dist < metres) {
      return null;
    }
    var p1 = polyline.getPath().getAt(i - 2);
    var p2 = polyline.getPath().getAt(i - 1);
    var m = (metres - olddist) / (dist - olddist);
    var result = {
      latitude: p1.lat() + (p2.lat() - p1.lat()) * m,
      longitude: p1.lng() + (p2.lng() - p1.lng()) * m
    };

    return result;
  };

}); // end of service

app.controller("HeaderCtrl", ["$scope", "$firebaseAuth","$location", "UserService",
  function($scope, $firebaseAuth, $location,UserService) {
    $scope.authObj = $firebaseAuth();
    // this is just to access the signout method from the view

    $scope.user = UserService.getCurrentUser();
 
  }
]);



/**
 * Controls all other Pages
 */
app.controller('PageCtrl', function ($scope, $location, $http, $firebaseObject) {
  console.log("Page Controller reporting for duty.");

var fire = firebase.database();

 var ref = firebase.database().ref().child('events');
 var obj = $firebaseObject(ref);

     // to take an action after the data loads, use the $loaded() promise
     obj.$loaded().then(function() {
        console.log("loaded record:", obj.$id, obj.someOtherKeyInData);
        console.log(obj);

       // To iterate the key/value pairs of the object, use angular.forEach()
       angular.forEach(obj, function(value, key) {
          console.log(key, value);
       });
     });

     // To make the data available in the DOM, assign it to $scope
     $scope.data = obj;


     // For three-way data bindings, bind it to the scope instead
     obj.$bindTo($scope, "data");



$scope.saveEvents = function () {
  // get new key
var newKey = fire.ref().child('events').push().key;

console.log(newKey);

  var input = {
    'title': $scope.title,
    'distance': $scope.distance
  };

$scope.data[newKey] = input; 

};





  // Activates the Carousel
  $('.carousel').carousel({
    interval: 5000
  });

  // Activates Tooltips for Social Links
  $('.tooltip-social').tooltip({
    selector: "a[data-toggle=tooltip]"
  })
});

app.controller('EventsListCtrl', function ($scope, $location, $http, $firebaseObject, uiGmapGoogleMapApi) {
  console.log("Page Controller reporting for duty.");

var fire = firebase.database();

 var ref = firebase.database().ref().child('events');
 var obj = $firebaseObject(ref);

     // to take an action after the data loads, use the $loaded() promise
     obj.$loaded().then(function() {
       // console.log("loaded record:", obj.$id, obj.someOtherKeyInData);
        //console.log(obj);

       // To iterate the key/value pairs of the object, use angular.forEach()
       angular.forEach(obj, function(value, key) {
          //console.log(key, value);
       });
     });

     // To make the data available in the DOM, assign it to $scope
     $scope.data = obj;


     // For three-way data bindings, bind it to the scope instead
     obj.$bindTo($scope, "data");



$scope.saveEvents = function () {
        // get new key
      var newKey = fire.ref().child('events').push().key;

      //console.log(newKey);

        var input = {
          'title': $scope.title,
          'distance': $scope.distance
        };

      $scope.data[newKey] = input; 

      };











});




app.controller('TokenCtrl', function ($scope, $location, $http, $routeParams, $firebaseAuth, UserService, $firebaseObject) {
  console.log("Token Controller reporting for duty.");

   var fire = firebase.database();
  

  var token = $routeParams.code;
  var currentUser = UserService.getCurrentUser();
  var database = firebase.database();

getAccessToken(token,currentUser.uid);

function getAccessToken (t, uid) {
  var token_data = {
    client_id: '21642',
    client_secret: '81980bc6ef83b3a7c5665698c299d579c46f8801',
    code: t
  };

  console.log(uid);
    $http({
        url: 'https://www.strava.com/oauth/token',
        method: "POST",
        data: token_data
    })
    .then(function(response) {
            console.log(uid);
            console.log(response);
            writeUserData(uid, response.data.access_token, response.data.athlete);
    }, 
    function(response) { // optional
            console.log(response);
    });

};
  



function writeUserData(u,t,a) {
  console.log(u + "   " + t + "     " +  a);
  if (u == undefined) {
    u = t;
  };
  var newAuth = firebase.database().ref('users').push();
  newAuth.set({
    owner: u,
    athlete : a,
    strava_token : t
  });
}

});



app.controller('SignUpCtrl', function ($scope, $location, $http, $firebaseAuth, UserService) {

$scope.authObj = $firebaseAuth();
$scope.user = UserService.getCurrentUser();
console.log($scope.user);





// $scope.authObj.$onAuthStateChanged(function(firebaseUser) {
//   if (firebaseUser) {
//     console.log("Signed in as:", firebaseUser.uid);
//     $location.path('/dashboard');

//   } else {
//     console.log("Signed out");
//   }
// });


$scope.signin = function () {
  var em = $scope.email;
  var pass = $scope.password;


var promise = firebase.auth().signInWithEmailAndPassword(em, pass);

promise.catch(function(e) {

      $location.path('/event/-L-s5kux7dNA-gLohEM0');
  console.log(e.message);
});

};





  $scope.signup = function () {
    // TODO check for real email address on client side
    var email = $scope.email;
    var password = $scope.password;


    $scope.authObj.$createUserWithEmailAndPassword(email, password)
    .then(function(firebaseUser) {
      console.log("User " + firebaseUser.uid + " created successfully!");
      $location.path('/dashboard');
      $scope.$apply();
    }).catch(function(error) {
      console.error("Error: ", error);
    });


  };


//    firebase.auth().onAuthStateChanged(function(user) {
//   if (user) {
//     console.log(user);
//     $scope.loggedIn = true;
//     $scope.$apply();
    
//   } else {
//    console.log('no user');
//   }
// });
 

});

app.filter('sumByColumn', function () {
      return function (collection, column) {
        var total = 0;

        collection.forEach(function (item) {
          total += parseInt(item[column]);
        });

        return total;
      };
    });



app.controller('DashCtrl', function ($scope, $location, $http) {
  
$scope.strava_token = false;



});



app.controller('MapCtrl', function ($scope, $location, $http, uiGmapGoogleMapApi) {
  

$scope.map = { 
  center: { latitude: 39.95, longitude: -105.81 }, 
  zoom: 12
};

$scope.options = {
  scrollwheel: false
};

$scope.polylines = [];
$scope.polygons = [];

$scope.visible = true;


$scope.markers = [];

function createMap (p) {

uiGmapGoogleMapApi.then(function(maps) {

      var rawLine = "mdzrFjaydSImD_CnGT`D`EfFXlHzFdC~FsClJBrIiIeCcHHoCfI{MvOej@vEqGtBmIMuKdKyMx@qEvK_KzQoKhAhFGyBzFyBfChCrF_FqBDB}DfMoF|@LNtFlBjErs@eUjRkMnc@}FrLaGdB{DjUeEd@iEbMaCjOkNhCyFpCkUeGzCiHpYePrFgEgDcCiJeIKiBaBg@wFjA}GgA{CuOyF}F_IuE`@sDxH{B`AqIaC}GVgIaIeOnAoM{BiAvAO{_@dFuGcG?}DrDcBtGeBm@|GaRyOtSmJx@zCiLeElF}BmAqD`G{LvE}G|HcI_CcEsHeDxBmLMy@hBfCtDz@lGeCzHdGfEUnFx@tBhYtLFlBkIrH~MxBcJjGsSpUyJf@{ElNaErFu@~Foj@d@}C~CcFlX[z^uBrKcBQ@|_A{D`RjCyGHbJOmA";
      var line = maps.geometry.encoding.decodePath(rawLine);
      console.log(line);



// function to get current location 

    GetPointAtDistance = function(metres, encodedLine) {
        // first create a google maps line that we can work with 

        var polyline = new google.maps.Polyline({
             path: encodedLine,
             geodesic: true,
             strokeColor: '#5589ca',
             strokeOpacity: 1.0,
             strokeWeight: 2
           });



    // some awkward special cases
    if (metres == 0) return polyline.getPath().getAt(0);
    if (metres < 0) return null;
    if (polyline.getPath().getLength() < 2) return null;
    var dist = 0;
    var olddist = 0;
    for (var i = 1;
      (i < polyline.getPath().getLength() && dist < metres); i++) {
      olddist = dist;
      dist += google.maps.geometry.spherical.computeDistanceBetween(
        polyline.getPath().getAt(i),
        polyline.getPath().getAt(i - 1)
      );
    }
    if (dist < metres) {
      return null;
    }
    var p1 = polyline.getPath().getAt(i - 2);
    var p2 = polyline.getPath().getAt(i - 1);
    var m = (metres - olddist) / (dist - olddist);
    var result = {
      latitude: p1.lat() + (p2.lat() - p1.lat()) * m,
      longitude: p1.lng() + (p2.lng() - p1.lng()) * m
    };
    return result;
  };

// find current location and build polyline;

      //var decoded = polyline.decode(rawLine);
      var currentLocation = GetPointAtDistance(1500, line);
      console.log(currentLocation);
      var singleMarker = {
        id: 0,
        coords: currentLocation
      };

      var singleLine = {
                      id: 1,
                      path: line,
                      stroke: {
                          color: '#6060FB',
                          weight: 6 
                      },
                      editable: false,
                      draggable: false,
                      geodesic: false,
                      visible: $scope.visible,
                      static: true
                  };
    $scope.polylines.push(singleLine);
    $scope.markers.push(singleMarker);



 
    }); // end google maps loader

}; // end create map function

createMap();

function markerAlongLine (distance, line) {

  var testLine = [[39.95223,-105.8103],[39.95228,-105.80943],[39.95292,-105.81079],[39.95281,-105.8116],[39.95184,-105.81276],[39.95171,-105.81427],[39.95045,-105.81494],[39.94917,-105.8142],[39.94734,-105.81422],[39.94564,-105.81257],[39.94631,-105.81111]];

  var l = turf.lineString(line);
  $scope.testing = l.geometry.coordinates;
  console.log(l);
  // var options = {units: 'miles'};

  // var along = turf.along(l, 15, options);

  // console.log(along);


  var a = turf.lineString(testLine);
  var options = {units: 'miles'};

  var dist = 0.85;

  var along = turf.along(a, dist, options);

  console.log(along);

  var singlemarker = {
      id: 0,
      coords: {
        latitude: along.geometry.coordinates[0],
        longitude: along.geometry.coordinates[1]
      }
    };


  return singlemarker;
};



});

app.controller('EventCtrl', function ($scope, $q, $location, $http, $route, $timeout, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, $timeout, StravaService) {
  console.log("Event Controller reporting for duty.");

var eventID = $routeParams.eventid;
var fire = firebase.database();
$scope.user = UserService.getCurrentUser();
console.log($scope.user);
$scope.activities = [];
$scope.athletes = [];
$scope.allowedTypes = [];

 var ref = firebase.database().ref().child('events/' + eventID);
 var obj = $firebaseObject(ref);

     // to take an action after the data loads, use the $loaded() promise
     obj.$loaded().then(function() {
        console.log("loaded record:", obj.$id);

        var end = moment(obj.end_date);
        var start = moment(obj.start_date);
        var now = moment();

        $scope.remaining = end.diff(now, "days");
        $scope.elapsedDays = now.diff(start, "days");
        var goalMeters = math.unit(obj.distance, 'm');    
        $scope.goalMiles = math.number(goalMeters, 'mi');    
       


       // To iterate the key/value pairs of the object, use angular.forEach()
       angular.forEach(obj.allowed_types, function(value, key) {
          $scope.allowedTypes.push(value);
       });


       getAthletes(obj.athletes).then(function(data){
            console.log(data);


            StravaService.getStravaActivities(data).then(function(r){
              console.log(r);
              for (var i = 0; i < data.length; i++) {
                processData(r[i], data[i]);
                if (i === data.length-1) {
                  createMap($scope.data.path, $scope.data.distance,$scope.totalData.distance);
                  createChart();
                  console.log('got to if statement to create the map?!?!?!');
                }
              }
              
            })
          // getActivityList(data).then(function(values){
          //   console.log(values);
          //   console.log('activity list done');
          //   //createMap($scope.data.path, $scope.data.distance,$scope.totalData.distance)
          // });
        console.log('all the athletes have been found');

        //createMap($scope.data.path, $scope.data.distance,$scope.totalData.distance);
       });

        // To iterate the key/value pairs of the object, use angular.forEach()
       // angular.forEach(obj.athletes, function(value, key) {

       //    getAthletes(value);

       // });
     });

     // To make the data available in the DOM, assign it to $scope
     $scope.data = obj;
    


     // For three-way data bindings, bind it to the scope instead
     obj.$bindTo($scope, "data");

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


};

function getAthletes(athleteArray) {

    var promises = [];

    var readyAthletes = [];

    angular.forEach(athleteArray, function(value,key){

        // console.log(value);
        // var userRef = fire.ref('users').child('users').orderByChild('owner').equalTo(value).on('value', function(snapshot){
        //   console.log(snapshot);
        // });

        // var userObj = $firebaseObject(userRef);
        // console.log(userObj);

        var users = fire.ref('users');
        var query = users.orderByChild('owner').equalTo(value);



        var ath;

          // to take an action after the data loads, use the $loaded() promise
         var pr = function() {
            var deferred = $q.defer();
            var user;
            query.on('value', function(snap){
              var k = Object.keys(snap.val())[0];
              user = snap.val();
              console.log(k);

              ath = user[k].athlete;
              ath.strava_token = user[k].strava_token;
              deferred.resolve(ath);
              //console.log(snap.val().k);
            })


          //     userObj.$loaded().then(function() {
          //             console.log(userObj.athlete);
          //             userObj.athlete.strava_token = userObj.strava_token;
          //             //$scope.athletes.push(userObj.athlete);
          //     deferred.resolve(userObj.athlete);
          //  // getActivityList(userObj.strava_token, userObj.athlete);
          // });
              return deferred.promise;
        }; // end promise

         promises.push(pr());
  
    });  

     return $q.all(promises);
};



//get activity list function out of service, do not use.... 
function getActivityList (ath) {

    var promises = [];
    console.log(ath);

    for (var i = ath.length - 1; i >= 0; i--) {
      console.log(ath[i]);
      
      var p = function() {
        var deferred = $q.defer();
        StravaService.getStravaActivities(ath[i].strava_token).then(function(data){
          console.log(data);
          deferred.resolve(data);
        });
        return deferred.promise;
      };
      promises.push(p());
    };


    // for (var i = 0; i < $scope.athletes.length; i++) {
    //   var t = $scope.athletes[i].strava_token;
    //   console.log($scope.athletes[i]);
    //   var options = {
    //          after: 1511834396
    //           };
       
    //     var bearer = "Bearer " + t;
    //      var promise =  $http({
    //             url: 'https://www.strava.com/api/v3/athlete/activities',
    //             method: "GET",
    //             headers: {
    //              'Authorization': bearer
    //            },
    //             data: options
    //         })
    //         .then(function(response) {
    //                 //console.log(response.data);
    //                 processData(response.data, ath[i]);
    //                 bearer = '';
    //         }, 
    //         function(response) { // optional
    //                 console.log(response);
    //         });

    //       promises.push(promise);

    // };

    return $q.all(promises);
};

$scope.totalData = {
      distance : 0,
      elevation_gain : 0,
      totalTime: 0
    };


function processData (d, a) {
   checkJoined(); 
  // add athlete information to each activity
  console.log(a);
  console.log(d);
  var list = d.data;

  var tempAthlete = a;
  tempAthlete.totalDistance = 0;
  tempAthlete.totalTime = 0;
  tempAthlete.elevation_gained = 0;
  tempAthlete.averagePace = 0;
  totalTime_pretty = '',
  tempAthlete.name_pretty = a.firstname + " " + a.lastname.charAt(0) + ".";

  for (var i = 0; i < list.length; i++) {

  // first need to filter so that only the correct activity types are processed, also check that start time is between start/end times of event
  if ($scope.allowedTypes.indexOf(list[i].type) > -1 && moment(list[i].start_date) > moment($scope.data.start_date) && moment(list[i].start_date) < moment($scope.data.end_date)) {


    // create a temporary activity object
    var tempActivity = list[i];
    tempActivity.a = a;
    tempActivity.a.name_pretty = a.firstname + " " + a.lastname.charAt(0) + ".";

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
    $scope.totalData.totalTime_pretty = moment.duration($scope.totalData.totalTime, 'seconds').format('hh:mm');


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
};


 $scope.filterByTypes = function(a) {
        return ($scope.allowedTypes.indexOf(a.type) !== -1);
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
            $scope.map = {
              center: $scope.currentPosition,
              zoom: 9
            }
        }, 1000 );
    }); // end google maps loader
  
}; // end create map function

// charting

function createChart (){
   


    $scope.labels = [];

    $scope.series = ['Goal', 'Actual'];
    $scope.chartdata = [[],[]];


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

      $scope.chartdata[1].push(cumulativeMiles);
      

    };  


$scope.chartcolors = ['#949FB1','#46BFBD'];

      $scope.onClick = function (points, evt) {
        console.log(points, evt);
      };
      $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }, { xAxisID: 'x-axis-1' }];
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
        }
      };

};





}); // end event controller


app.controller("CreateCtrl",
  function($scope, $q, $location, $http, $firebaseObject, $routeParams, $firebaseArray, UserService, uiGmapGoogleMapApi, CalculatorService, $timeout, StravaService) {

// scope variable for the form 

$scope.newEvent = {
  title: "",
  description: "",
  distance: 0,
  people_count: 0,
  path: ""
}

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



  }); // end create controller 




