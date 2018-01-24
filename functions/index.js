const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});


exports.newstravaactivity = functions.https.onRequest((request, response) => {


var x = request.body;



 console.log(x);
 response.send(200);

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

