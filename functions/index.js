const functions = require('firebase-functions');

var admin = require("firebase-admin");
//var serviceAccount = require("./serviceaccount.json");

admin.initializeApp(functions.config().firebase);

var db = admin.database();

var Promise = require('promise');
var request = require('request');


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});


exports.newstravaactivity = functions.https.onRequest((req, res) => {

	var userStravaId = parseInt(req.body.owner_id);
	var activityId = parseInt(req.body.object_id);
	var fbUserId;

if (req.body.aspect_type === 'delete') {
	console.log('got to delete function');
	var userStravaId = parseInt(req.body.owner_id);
	var ac
	const users = db.ref('users');
	const query = users.orderByChild('athlete/id').equalTo(userStravaId);

	query.once('value').then(snap => {

	const k = Object.keys(snap.val())[0];
	console.log(k);
		var act = db.ref(`users/${k}/activities`);
		const q = act.orderByChild('id').equalTo(activityId);
			q.once('value').then(s => {
				const m = Object.keys(s.val())[0];

				const objectDelete = db.ref(`users/${k}/activities/${m}`);
					  objectDelete.remove();


				res.send(200);
			})
	})

} if(req.body.aspect_type === 'create') {
console.log('got to else function');

const users = db.ref('users');
const query = users.orderByChild('athlete/id').equalTo(userStravaId);

	query.once('value').then(snap => {

	const k = Object.keys(snap.val())[0];
	const user = snap.val();
	const strava_token = user[k].strava_token;
	fbUserId = k;

	var bearerToken = 'Bearer ' + strava_token;
	var finalURL = "https://www.strava.com/api/v3/activities/" + activityId;

	var promise = new Promise(function (resolve, reject) {
	
		var options = {
			  url: finalURL,
			  headers: {
			    'Authorization': bearerToken
			  }
			};
		  request.get(options, function(err, r, b) {
				if (err) {reject (err)}
				else {resolve(b)};
				// console.log('error:', err); // Print the error if one occurred
  		// 		console.log('statusCode:', r && r.statusCode); // Print the response status code if a response was received
  		// 		console.log('body:', b); // Print the HTML for the Google homepage.
			});
		});
	return promise
}).then(function(data){
	var newObj = db.ref().child('users/' + fbUserId + '/activities/').push();
    var newActivity = JSON.parse(data);
    newObj.set(newActivity).then(function(){
    	res.send(newActivity);
    });

	
}).catch(reason =>{
	console.log(reason);
	res.send(500)
	}
);
} else {
	console.log('I got a new activity that I dont know what to do with:   ' + req.body.aspect_type);
	res.send('i did not understand that one');
}
});


// find the strava token based on the incoming strava id
// use that strava token + strava activity ID to pull the activity from strava
// store that under the users's activities account

exports.incomingTest = functions.https.onRequest((req, res) => {

var userStravaId = parseInt(req.body.owner_id);
var activityId = parseInt(req.body.object_id);
var fbUserId;

const users = db.ref('users');

const query = users.orderByChild('athlete/id').equalTo(userStravaId);

	query.once('value').then(snap => {

	const k = Object.keys(snap.val())[0];
	const user = snap.val();
	const strava_token = user[k].strava_token;
	fbUserId = k;

	var bearerToken = 'Bearer ' + strava_token;
	var finalURL = "https://www.strava.com/api/v3/activities/" + activityId;

	var promise = new Promise(function (resolve, reject) {
	
		var options = {
			  url: finalURL,
			  headers: {
			    'Authorization': bearerToken
			  }
			};
		  request.get(options, function(err, r, b) {
				if (err) {reject (err)}
				else {resolve(b)};
				// console.log('error:', err); // Print the error if one occurred
  		// 		console.log('statusCode:', r && r.statusCode); // Print the response status code if a response was received
  		// 		console.log('body:', b); // Print the HTML for the Google homepage.
			});
		});
	return promise
}).then(function(data){
	var newObj = db.ref().child('users/' + fbUserId + '/activities/').push();
    var newActivity = JSON.parse(data);
    newObj.set(newActivity).then(function(){
    	res.send(newActivity);
    });

	
}).catch(reason =>{
	console.log(reason);
	res.send(500)
	}
);
	
});


exports.syncActivities = functions.database
.ref('users/{pushId}')
.onWrite(event => {
	var userKey = event.data.key;
	var objData = event.data.val();
	

	const root = event.data.ref.root;
	const userEvents = root.child('/userEvents/' + userKey).once('value');

		return userEvents.then(s => {
		  			
		  		let eventKeys = Object.keys(s.val());
		  		console.log(eventKeys);
				let updateObj = {};

				// create an entry for each event the user is in
				eventKeys.forEach(key => {
					updateObj['events/' + key + '/athletes/' + userKey] = objData;
				});

		return root.update(updateObj);
		  })

});






// const ref = functions.database.ref();
// const usersRef = ref('users');
// usersRef.on('child_changed', snap => {
// 	const userEvents = ref.child('userEvents/' + snap.key);
// 	return userEvents.once('value').then(s => {
// 		let eventKeys = Object.keys(s.val());
// 		let updateObj = {};

// 		// create an entry for each event the user is in
// 		eventKeys.forEach(key => {
// 			updateObj['events/' + key + '/athletes/' + snap.key] = snap.val();
// 		});

// 		return ref.update(updateObj);
// 	})
// });

