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