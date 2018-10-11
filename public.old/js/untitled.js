var fire = firebase.database();

var externalID = 12345;
var users = fire.ref('users');
var query = users.orderByChild('athlete/id').equalTo(externalID);

query.once('value', function(snap){
      var k = Object.keys(snap.val())[0]; //gets the key of the first result
      var user = snap.val(); // sets user = full returned object from firebase
      console.log(user[k]); // logs below
});


//userObject

{
  "athlete": {
    "country": "United States",
    "name": "Jack",
    "id": 12345,
}