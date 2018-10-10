const functions = require('firebase-functions');

var admin = require("firebase-admin");
//var serviceAccount = require("./serviceaccount.json");

admin.initializeApp(functions.config().firebase);

var db = admin.database();

var Promise = require('promise');
var request = require('request');
var forloop = require('forloop');
var moment = require('moment');


var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyDUEvmx4SYccJerkf5e8mUEE7zEMWfiM1M'
});

var polyline = require('@mapbox/polyline');
const decode = require('geojson-polyline').decode;

var sphericalGeometry = require('spherical-geometry-js');

var turf = require('@turf/turf');



// START 
// FUNCTIONS FOR THE NEW VERSION OF VIRTUAL RELAY
//
//
//
//
//
//
// copy functions that are needed from below up to this section

// this function handles incoming activity notifications from Strava, finds the user (based on strava user id),
// then stores the activity in the /users node in the database under the user's activity list. 

// notes on this function:
//			-The 'create' process for new activities works great. 
//			- 'delete' - I don't think it works anymore, but it may have worked at one point. In my testing on 10/9/18, it didn't work
// 			- 'else' == 'update' doesn't work at all. I setup a Zapier function to text me when someone updates an activity and it happens all the time.
//				We'll want to update this function to handle both 'delete' and 'update' notifications from strava
exports.newstravaactivity = functions.https.onRequest((req, res) => {

	var userStravaId = parseInt(req.body.owner_id);
	var activityId = parseInt(req.body.object_id);
	var type = req.body.aspect_type;
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
console.log('got to create function');

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
    var jsonObj = JSON.parse(data);
    var newActivity = {
    	athlete : jsonObj.athlete,
    	distance : jsonObj.distance,
    	elapsed_time : jsonObj.elapsed_time,
    	id : jsonObj.id,
    	map : jsonObj.map,
    	moving_time: jsonObj.moving_time,
    	name: jsonObj.name,
    	start_date: jsonObj.start_date,
    	timezone: jsonObj.timezone,
    	type: jsonObj.type,
    	total_elevation_gain: jsonObj.total_elevation_gain
    };
    newObj.set(newActivity).then(function(){
    	res.send(newActivity);
    });
 
	
}).catch(reason =>{
	console.log(reason);
	res.send(500)
	}
);
} else {
	var zapierURL = "https://hooks.zapier.com/hooks/catch/321045/z1f2fg/";

	request.post("https://hooks.zapier.com/hooks/catch/321045/z1f2fg/").form({'user': userStravaId, 'activity': activityId, 'type': type});

	res.send(200);
}
});


// this function syncs new activities that land in each /user node, finds what teams the user is on, and syncs the data to that team
exports.athleteActivitiesToTeams = functions.database
.ref('users/{pushId}')
.onWrite(event => {
	var userKey = event.data.key;
	var objData = event.data.val();
	//console.log(event.data.val());
	

	// first, find the list of the teams the user is a member of
	const root = event.data.ref.root;
	const userTeams = root.child('/user_teams/' + userKey).once('value');

		return userTeams.then(s => {
		  			
		  		let teamKeys = Object.keys(s.val());
		  		//console.log(eventKeys);
				let updateObj = {};

				// create an entry for each team the user is on
				teamKeys.forEach(key => {
					updateObj['teams/' + key + '/athletes/' + userKey] = objData;
				});

		return root.update(updateObj);
		  })

});


// this function is triggered when new data is entered into the athlete node in a team, basically when a new 'activity' is logged from strava
// then it updates the 'summary' object for the athlete within the team, giving a summary of the athlete's activities as it relates to this team
exports.updateUserTeamSummary = functions.database
.ref('teams/{teamID}/athletes/{athID}')
.onWrite(event => {
	// console.log(event.data.val());
	// console.log(event.data.key);
	// console.log(event.data.ref.path);

	var athletePath = event.data.ref.path;
	// console.log(athletePath);
	const root = event.data.ref.root;

	const userActivities = db.ref(athletePath + '/activities');
	

	//return this userActivities.once
	return userActivities.once('value').then(s => {
		
		let activityKeys = Object.keys(s.val());
		processUpdate(s.val(), activityKeys).then(function(summaryData){
			let updateObj = {};
			updateObj[athletePath + '/summary'] = summaryData;
		return root.update(updateObj);
		});

		
	});

function processUpdate (data, keys) {
	var summaryData = {
		total_distance_meters: 0,
		total_distance_miles: 0,
		total_elevation_gain_meters: 0,
		total_elevation_gain_feet: 0,
		total_time_seconds: 0,
		total_activities: 0
	};
	var activitiesProcessed = 0;


	function getMiles(i) {
     return i*0.000621371192;
	};

	function getFeet(i) {
		return (i * 3.28084)
	};


	var promise = new Promise(function (resolve, reject) {
				keys.forEach(k => {
					activitiesProcessed++;
					if (data[k].type == 'Run') {
						//distance
						summaryData.total_distance_meters = summaryData.total_distance_meters + data[k].distance;
						summaryData.total_distance_miles = getMiles(summaryData.total_distance_meters);

						//elevation
						summaryData.total_elevation_gain_meters = summaryData.total_elevation_gain_meters + data[k].total_elevation_gain;
						summaryData.total_elevation_gain_feet = getFeet(summaryData.total_elevation_gain_meters);

						//time
						summaryData.total_time_seconds = summaryData.total_time_seconds + data[k].elapsed_time;	

						// count
						summaryData.total_activities = summaryData.total_activities +1
					};

					if(activitiesProcessed === keys.length) {
							
							resolve(summaryData);
						};
				})
		});

	return promise
	};

}); //end of exports.updateUserTeamSummary


// this function is triggered when an athlete's summary is updated within a team.
// it then updates the summary of the team itself
exports.updateTeamSummary = functions.database
.ref('teams/{teamID}/athletes/{athID}/summary')
.onWrite(event => {
	// console.log(event.data.val());
	// console.log(event.data.key);
	var p = event.data.ref;
	var athPath = p.parent;
	var athletesPath = athPath.parent;
	var eventPath = athletesPath.parent;
	console.log(eventPath.path);
	//eventPath holds the reference to the event object


	// var athletePath = event.data.ref.path;
	// console.log(athletePath);
	const root = event.data.ref.root;

	const athleteList = db.ref(athletesPath);
	

	//return this eventSummary.once
	return athleteList.once('value').then(s => {
		
		let athleteKeys = Object.keys(s.val());
		processEventSummary(s.val(), athleteKeys).then(function(summaryData){
			let updateObj = {};
			updateObj[eventPath.path + '/summary'] = summaryData;
		return root.update(updateObj);
		});

		
	});

function processEventSummary (data, keys) {
	var summaryData = {
		total_distance_meters: 0,
		total_distance_miles: 0,
		total_elevation_gain_meters: 0,
		total_elevation_gain_feet: 0,
		total_time_seconds: 0,
		total_activities: 0
	};
	var athletesProcessed = 0;

	console.log(keys.length);

	function getMiles(i) {
     return i*0.000621371192;
	};

	function getFeet(i) {
		return (i * 3.28084)
	};


	var promise = new Promise(function (resolve, reject) {
				keys.forEach(k => {
					athletesProcessed++;
					if (data[k].summary.total_activities > 0) {
							//distance
						summaryData.total_distance_meters = summaryData.total_distance_meters + data[k].summary.total_distance_meters;
						summaryData.total_distance_miles = getMiles(summaryData.total_distance_meters);

						//elevation
						summaryData.total_elevation_gain_meters = summaryData.total_elevation_gain_meters + data[k].summary.total_elevation_gain_meters;
						summaryData.total_elevation_gain_feet = getFeet(summaryData.total_elevation_gain_meters);

						//time
						summaryData.total_time_seconds = summaryData.total_time_seconds + data[k].summary.total_time_seconds;	

						// count
						summaryData.total_activities = summaryData.total_activities + data[k].summary.total_activities;
				
					};

						
					if(athletesProcessed === keys.length) {
							
							resolve(summaryData);
						};
				})
		});

	return promise
	};

}); //end of exports.updateTeamSummary function







//
// END 
// FUNCTIONS FOR THE NEW VERSION OF VIRTUAL RELAY
//
//
//
// ANYTHING ABOVE THIS LINE IS FOR THE NEW VIRTUAL RELAY VERSION, BELOW CAN BE DELETED LATER
//
//
//
//
//
//










// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
	var distanceTest = request.body.distance;
 	var path = "o`~`Gldd~NBzHnAC|AIrCA?H??~p@DxIpKfVr[~QxVfAbJ}BfU{N`Wcq@jaAia@zWypAaBee@hF{KpYcNpkAkHpd@dBnrBuGxt@ik@xvB_Kx_ApDtrCjD`iGkNh~BrDzx@jZh_NxExqBhEhwA]``AyZviAiDn{ArGpgE~BlpApQbv@}CfaBrMflAxC|aAkIniB\\xbDlEz}Czv@~jCvIfbBxR~cA`@vuF~KfzDpSlnByDj|AhKhqA|HnbBEpfHY~kSfDvtAbb@haB|BlhLoOveEpBx|EyN`x@w[t_@o`AjiAoKti@zAjvIbBpdPaQzw@_s@dtAeQht@mD~oNgCzgBaI|fAxEbk@pr@btCvXdwAdK`uCxUlo@|gAvzBz`@h{@rJxo@qRhfFwCtrDsXzgCiw@viHaSxjBe@`z@bLloEfi@jxFnSltAdE`bA}GxdDjG~bErDlX`b@zz@~bAbbBpm@x{Bfc@zrAlKbu@yExkD^vgJhElxE`aAjbDtObw@lAttFhHn~ChVddHfRvhAli@tbB`JhqA`Dn|BtB`nEj|@hbFx[rdBTl{@oc@nzC_CjyCuA|yGlTxzACtoDxQnhFtLhmBb^toCh[jvCvSptJ`Ibi@`Stb@||AntBd|A~cCheCl`EngFpuCpf@dj@b|@lxB`f@hnA`^zfCfUrqAvqBlkCtdAzzBnQvIpq@r@|kClo@b_AnXheAxk@txDlvBzYvGlf@yJ|Yp@j\\dSbfChvBlq@xj@rXxH~`A`@tXrGh_@di@tkGd}Mb`@dk@zaAn~@bcCreBz|@riAd}AncCvcEvsHbQhM|d@hE~lA~Axo@|Ofv@bT|Q|Pxt@~yAxSxyB|Sxr@vaA`nAzJpe@BrkAeB|pJ@xoApFxe@vaBhuDzuAhzCrLze@~FdpDzBxyA|Iz\\vqAn{BrHts@K`qCfCjd@|WbeArDdk@eAtnCb@|}@vNvuA`W~fBxt@~aB}@hGkQdHeI\\sCyDmD`ZjJnhBrRjlDnRrhAmBdi@qZlZgt@xLsVdi@iEdbBoWzoBuJfbCu@fsAtLxpAl@fr@kJziAyGveCgBdqFo^fjA}[|Qe[tIsVxa@w`@dn@{l@hEwv@vj@{yC~v@cdBqAok@H{UfKkb@va@}^r`@oOh]ix@pfAsk@v|@_xBzgDweCnyDeKfVEhWeHpQeO|Lc_CvAaw@fBkSqH{tBfAgyAzByHmEoDm\\iDskA}G}CoUhIqw@`[uU`DeKyEeUcFej@b@iUQyEsH_GmJgPZc^Pov@lb@gIdZew@nJ{j@|Rkm@lLzA|\\j@`oA??x|A_Bvi@bGb@veAfd@kHnYa^`n@or@z{@pw@rU~cOVfeO{HxoOdtDb}Gfq@tlHrvArxCroApcAaAzsE~UprOfi@~dTnDzfZumBnoIciAjrC_bCvbDg|BdeNc_Ax{Eu~B`sDoDxtCyQf|P`Y~dVw^fvZ|}A`hMzsAxfIh_BnsHpkFf~UwBpwSp`@`iI~wE`rKjhBtfO`tAj`C|G|hPysAppTn~AfrCbdCltIvgCbiW|sAdoDnWlyDfs@nlD~sEhnD~nCpuEznCcJhpGdtHjaBjoGt\\zjGuP|kA_eCnUorBb}BowAd{@wP`}B_HfyH|Fd_OgWlkSigBn_]odBdbO{D|qMiu@v`WcOvfJui@jwJup@lqEmUnbSkZxiUsoBrdIxAxbLss@fmU`f@hyXxAxwMl@r|Ruu@ru_@o@`en@l@~dk@c@doVtClgP`CluFfnAp}H~Crtb@q\\r_MsuAfqGbpBfkTrs@jwUznCnb^{H`r]ze@vxCfxH`FlWdgEtaDjlIrvCjnZtl@xtEraBpzH~@hzJxExhGjdChmDdMlxGGxlQ{Pv`UlPn_ZmVdrPMr~gAgDfqo@qCrjq@bxCn_AhdDhnAdzAzmCb_EnjEdgDrkBboDvvDjhAj`Ed~KrfJv~CtkD~fArcB{AhmKv_@hjJjSpbO|Ab_Fh@r`A~u@vKr|Brc@ryBnaDt}G~qKnhGhdOhpDvaDxlDaLboClsBv_CtzIlfJpmN|bDdaO~b@r_GFl_HdDrsHbbB|nCblCneExsFtsE{Q`_SpBhv`@w@pjqBiDj{mBuTvt^`d@bhGb_AxtK~vG~dXfaCpwGbfCfyLzK~xM|{CfaRdbBrvVvy@jzNoBp_Kwa@pkViyAneVwSz}XyYx}PwuAtbN__DncHgeBndKyqHvmRq`Knn[g`Kxl]sbHjmSgeBnfCieAzjJodHjpXu`BvnKi~BtiH_aAn_HmxAlkOe^z`N{rCn|`@n@nxi@~~BjeMbt@dd_@pTlvDarAd|K{OnrYh{BzzQlkF`mk@zcBtaM`aCjfN~tF~aItrCv{GptD`cK|i@~aMrEb_JptAvqGflB|cJdpN`gw@vvLfh^lnQv~\\bvBnrBr_TfkMhnShaRjpKbnRhiOhp\\xNnzSlPvcUSxaIp}@xvBzbAp`CfKzkF{]jrS`tAliGvJ`tNreCzrKjrFd`UbDn~D~[boKv|GpzK~{@lfL~uEhdMdbDjcCboLd~MzqKv{LtvFt~Nt{HdnIrJnuBz{@_aBr`B_mB`}@zb@dzGh@??AxIEbQ?vTCt\\zLD??xGC?tBAvDDtRXnEFbB`C?bLAvYB~JJz@d@pEZrB@?lM@`TDrn@?`\\C|x@`@vaAPdJtJ~@bFlA\\fpAL|mBg@ljCh@nuEXtuEGvgJOrOnE|FnOjGpCfD|VxYx{ApfAp[rYfLjOf@jRyBxT_Ar^oJ|h@i@rv@uD~NyLtPyKxp@qDlb@zBh^oHflAkCjWkFlQuIl^}Bpq@gO`_AcKxn@vAxTj_@rf@ne@py@tD|SaHtd@wGfWkIvM{PbQsK`SeFpU}@pN[ln@qGvSeHzNwA~KhD|]`@tLoBbOkBvRXpQl@t_@aCtOwQp^uNj{@{HtZcNj\\yTxXgK`K{NbGaQzM_UtLgUrFqKzXh@`OdIlQ[rLwBhNfEzRx@xLsAzHqLvXaC`NM`WlF|Iz@xLFdYzFzw@{AlNwAnRbCfLdL~YtHzZInl@gEtZbAx[z@|SUdJwFt[uGpk@{ElZ{Ltj@qHjTeOnT}E`Q_N`OaEnJIhTgJl_@aQ|e@mMj[gDtRiEr}@v@tk@gEpt@_ExdAaBr\\XnSzAtUvCjMpGv_@xIl{@l@|p@bJjc@hCr]wBpf@v@`[iHnt@u@jQXbfAmAfb@_@dw@IlVaE~WmBfN\\lKeCn_@vB~OWhKsAfLd@|LoF`\\sJf[iFzWiHlTsOlQsEdq@cPhzAgDvo@pAvR`]vlA~ClYf@pN|CbN^jFcBJsEuRqFsKuC}MaP{c@qPw]iEsYoJqXsGsFw@gKkCaImAhAzBtHZrRu@fCe@mGiM{_@aK{KcLkDgDvApAjEzRhOxD|PnB|F?hJg@|FuEbJcBjG_Ao@zDyJz@cO{EaLmOsRmLcAeDr@aJfFqFaBo@_FtC_Hf@sLgEiKkImGgElAiHPiF}@cHgJ}Mf@kBaA|@oBbGe@tGs@vJlDtCcAoAqBgQgFkDk@_IbCgGzJeBtLyEzCqGmIiNaLkGsNeL{NaLqDoMNwDhCqA[s@kPwEkHmBa@_LbGgDzEaDx@mGsCsNuWaYuNyNcDiTsN_C_@}CbBkC`CeAqCfE{BjIGdQ~FxIGzSv@zSdIbHNxL_BPeDcMfBsu@u[qWgHkYgDaZUyVpCoPwAkQiGgMgCkQk@if@hBor@pOa[hc@}GhEcIjAmNg@{FhAuGtEmP`SqKxUaKpg@_ClJsFhHyPpIqSvA{ShFqL|@aNpBmTnKueAp\\wJ~FyZp^cXpm@aQbm@gO~WaOpKiShJmAXG}SB{HSwDkCmB{@iErC}Pp@wY?qjAdCwR|DuQZsLzBwFzFsQjBmBzBPhDy@J_D~@{B??_i@pyEs`FvrBcv@bsKkwAvbEuyCz}@o_EmiAywBh{Ci_GtpGi`GfLkgErvFg`MxwHgrE{_C{rEdgC{oCnVq|DznCieDdoAwuEvlKwtIddEeuN~sMcjU_M_qFgkAacKri@swJdiCeeImhAiw@lsEulN`nM}jMd{J_iBliEyfO`aVsvCd_GatAdtVixLgpDicMecAwsMxfKghFyU}lm@dhC{gEtfAwfAfnWmhD`_`@`IhfWq|@xrX|fHdov@psLll}@vfGjaz@mjBjwy@cCjwQqoDfmNmmB~gR|~Br}JntJ`jf@fmBd_M{wAf{Cn_EfmEntHfnZ~PxrIobEbqLf~Axbh@dBli^zdAd{HbpK|_Sj`Ofka@fyDprXbfJ`~f@uBhwZ}bArdFbuBdfH|dC~jHrC~bSfb@voH~uAt~NlyK|`LdtIfbEzyCrkHvlLtuVn}K|ySp|F_nDrlLosCpqH|iBnjBx}GbcGj`CnvDfdI_tErpI|aAnhMrNjlO~nDvkMuZphKenBxoEmmDblAaa@|kPiEvvQvzBvnMzoFfhLdaHd}Ky{Bl`Z__Lp{s@_nJ~j\\}fA`mD`bDztHhsKtr_@n]rwZmi@fpbAat@fmyAusFj`O}hTvjT}jEheL}tZf~g@m{@hkXicFrbTjNnzOdG`d]dxAdfXll@bhVfmGbqQhbFv_KtnGd~E|pAhf`@zsFh~LdmJ~eIjsDnpJtfHzsP~rHhgKzeAvqFetAnsFzu@hvMrjGpaSr`EtgQyeBfrXscFtgO|bDh`^f~AptKdlEz~Ej~@|zSigChxIaaLpoLiqHteKywPnvUkzK`hXmcD|wXolOf_WvbEliThgGrnMpiL|n`@pme@`uXnzJpy^zsK~oHjy\\`fChsYfyL`pNjuQd|IhkIxkL~uX~jKr_E|}If`L`rUj|k@|`R~tRltUd`ZwK~hQjtCtlJlMr{IbpBxiHnp@toL`qEnaM|kBxlEwk@lpFmxAdcM~fAvbTb|@nvStUh~CxqDcOpyEr_BvtDtxB`zEqk@jg@|vGhu@dmH`zDnwJ`k@b~PywAp}KfuDxxUhQzbLkp@l~Fqj@tvFjeCvhIfnJnkQp{FhjHpfEp~K|rEnaJj|GxmErkTp`JbyNvvK|~Oz~Uxk`@pzd@fYfaLheDlyOz`Fn{Cp_BbpNvwG~rXlfa@vzl@rqH`iDnoJ`tLtpO``UleBfpG|dBdrFq~AtsFwoChbM|jGj_RlhFztEr_KiBzoHmeDpxGmUpsIi[rqC{dC`sEyw@zm{Kijhfq@@Fn@Ir@Dd@\\dA|@bAbA@VI~@@vAQfDDlA?tA?`BOdAW~@k@dBe@jAUtAs@tA_@d@UJm@j@eBvASPm@dA[p@_@bAMl@@RAd@Ol@aAdCYv@Or@UfAc@~Ay@rCUt@i@bCuC~As@DyDAi@B}B^iA^oBbAwA`@}BzBa@X{@RaE^o@Jm@\\ORUNwG~Cm@d@a@h@q@q@e@j@}AtCg@|A[rAy@dGi@~BcAvBmAbBkBrAmAt@sD|BwBpAg@d@s@jAg@tAKf@MfAC`Ah@dJAfBGnAeDdZU`DIpBGrDV|PXxNm@DiBMm@|JiB`Y?\\Ff@ZnALPhB~ALZDNEj@k@hFSfAYn@YZy@f@}@hA_CnD[ToA`@gAz@oAtBWh@Uz@yAf@{A`@w@f@OFUPUDI?Kn@[tAe@dB}@`Gw@nCCzABv@VvAb@~@T\\h@b@fC`Bt@p@j@j@j@`A`@x@b@zAFSIa@?O??vLtd@dTri@oMzHoRdWiN~XwMdPPtW}GrVkH`UkLtEmKhCaA~@k@nCnK|L`Rpc@cIrAcN`FuPx@uWq@mJgFyDmDmDK_VsAcCrBcAtEqD\\aGlBgJVgJrFaDtXgAb_@uBzNY~XyAhMaH`IaDnC_EjAsDSaC?\\xTmD|JcHnIeDxOkPdu@~NzeAdCnOq@jL{@zLn@tKdDlJzEdDxBxG}@v@u@xAbBrClCdC}A`a@cJbkBUtEsBMwAAkC^}PnNkTrScIvH|@nF~HtZrUl_ApMfdAzFbT@fBcTrEsXzEGu@oFv@iBnGqLfOqAfWpB`UOdH}ArOmClTsDxGiDp\\yIlNyEfQqI`e@uBlt@nBtTyFpQqDdRsEvIsJbIqSfF_NxHyb@~GqFr@uBlFsMzg@qHnUL~UiCbIgJbJiJvRs@n\\g@zO{FnWaPlUgNvHib@tKgQdImGbLaDfZcIhMcMzJgGv[qN`c@mHlRm@rJdA`i@Hr`@gCpU{Lh^yHdRqEdRcOnFaL|FsLhKiFvEpBbE`AlBlBhEpDtI}@zO}@xIpClM\\hSbB|AnEmBlM{VnKgIxFb@TlDuAbIpUjk@hs@bqAzl@pqAbWpw@~Ite@lHd|@bCjh@rFve@bXj_A~Vpg@xRdYn]l^pVfQll@vWvf@`[hW~Zfk@j|@nLdKvs@n\\lZhOf^tYfx@jhArX|W~U`OtfAr_@`V`MbXpVtTh`@lKz\\hR~|@nI|Uz[vj@|V~e@zJph@`H~rAjNjy@xEvu@?nh@mCho@oGxz@]zc@fBja@jIzaAfAp~@pCja@dElVrRvd@jVrf@xGf[~Dv_@tEzSxF|KbO`NjF`MBdQ`ExVlKbRxCrLuElu@}G~c@gMbd@yUlcAiEhr@xDthC|@`q@}EjY}U|g@mOdTaRbIoNlMmQpg@kSdd@yU`dA{Hhn@iIpQkO~UwEfR}N~}@gc@z}BqTdoBnCjOr[|q@|YhkAjLbLlHjMZnbAAzTqBdQ_Efa@ZnaAzB`h@nFtOdN`WpAh~@lGpfDpEvrBrEnIfFlA|RqRjFNnQnYpInUtA|J}HlJcLtDiCfGZ|E|@lLeBnSkN~IqFtGqChLgF`RiEhMq@j^rG~UfCxJOpH|@hPzKdDzX`GtC~F|DhBhGBhChCnBzWOlUuC~D_GhDyE|Qz@~KzGbSlA|Hy@|QgHn|@\\dQ|AjElCz\\mD`KXjFpG`QtPrGtKpGzXjDrK_BzAeDq@wEe@w^_DgVpBR@{Bi@kEi@uBiBlFSxBuB~@wKgBaPcEJxBAjD??EKF_DKyBtHfBjFzA~Af@zCj@rBRf@?dADj@QBs@Dw@Pe@c@Jm@EuBCw@ByCc@kASy@[eBk@_AeEs@wA}DgG}@}Cy@gIeA{Jq@oGUuCg@@_FNkACi@IkA[cA_@mEiByAYeCIkAtG[nB_@xCe@zDWhCA|@HhDPbJDd@Hb@Nd@\\t@n@nARj@Nn@H~@~A~R@bAGp@Un@uA~Cm@~AS~@K~@Az@Dr@Jz@^fAr@pAlAvBTn@RjA^pDB|@Gz@Wv@MVUP}@n@yChBqA`AiAf@ID??cHjEw@`@_@JSBUAWEWMi@o@y@gAm@Ym@Ig@BqDh@mAR_AXwHhAZ`Df@xFhFm@lDi@fBc@XMx@k@t@e@d@a@hCiCpAxBhGnK~BfEjCzEh@|@jCdFn@`BdBzFxCzIx@nBTQv@g@p@m@z@s@s@uBeBvA{AhAe@`@Qi@gAyCyB}Gs@eC_AmCyBkEsB{DmCyE??bvDuH`s@fbBd_C|_FwDlyEd_D|nCx{F~dDxnKpqNlbI~dKlfBhiBxQbbEvkBtdLdqIhwJ|gArxFcr@xiHwcBn{GiCfgFbDfaGfj@tqCfZ|bBppBhdAp_GdxCdfEpcFjqId{CbfE|CnyB~qBfTd~JyeHbpVfoAlwKjgBnxBv|AlkJ`pGb`J`uHjmGfpCdxLraDfxGplDr_Ed}LrfFdeFjxMbaEfbMza@j~KdSlhKtrAphGiU`gGsRrtJ_i@x|K}bEv`RqiFxzJg{Bt{NfgAtoJt{DfmKg`CjkSenCfgFm`D`pA{aKdlDmiCpmAkMdoFnjDlrJjWraCqpC~kFew@djGi~@|dUG~_ThwDrlTqrAzpGty@lxEh|CdkGv~Bf~GfaH|hD`qEdrDylBzsFfP~kUciAfqJxz@buEhn@riFchA~rGy~AhiQivCtnFxUtoCmdCv}An}@nmHuYvaDw}BreAzQbpErqEhqHd}AtiMlhEvyAlrAz_EheChwB|`ApfChr@h`GvvEnpFlwAtuDnn@|aKm{@vxEpPhhJe`BjtG{y@nxF_x@lvI}MlhDbpAvwErx@tcEtGlkGf}BdgGiaChbHrPnuBzn@|oE_nAtvHmsDvxJoVltJl\\npEkmAxpE_gBrkOpeAphDfeD|qP|wHrqR|mBpzGgo@x_KtK~dJ}lBprJrwC`zPhyJ`bb@j}E~vRbqGl{AdaAloIfoC|pHdfE~sG`|A`pMrjBfsDuA`jEFzoKdgCtiJnChhIl~EjsHlgBrpLyNnjHe{AxrQ|oAdgDq`@nkDllBfdIxxC|wC|g@zcDqp@~aKywBjxXwuB`tKrcAxwG_mA|qCrr@jcDxaA|zCak@lmAyc@d|D{_@riKhqAf}Cr~B~bC~cEnrG`aGnlGplH|iD|mE`iCjhDjeFx}FnrFfgJl}EngC~oEz{Dh`@|nBdaCvsCtvLhsE|{JugBf}Lys@rfGu~EtuKp`@jjGfgBp~E{g@loCrfAjqCpZb{E{pAd_C{QbqEdtBxaEmJdfDs|BduAwcBfwEoeFvN_Wp|C~j@poEegA`nEezCbzE_bBjgCz@dbFvdAtqDhbCft@drDf|Epv@boIcy@fmDvyCxlERt_FdhBtqC~lDpeCbw@dcEvtCnuAltCrUp~CfD`bCwnGveCxtAhpEhhA`aBdRh_AxlCvtDz}CnbBdlEbwAthA_Rz}Ddy@|hL`oBz|EjBnxEloCjsIhaAvqHaT`|Hf}@zaEnbCf~CuOh~CjzBfdB{u@`sCvSfd@lmhAnso}@GFoTaFqu@obApqC{oDa}DmbIwbBceDutLp`GesMvfDsbMjyEepLb`Do{IljHwjE``C}vC|}@_tHzgF}}D`yCavApm@}zF`eEklCfcDu{B~aBmyIboFenEbrDoxAhaC_vH|cNucGbvHs_G`oHw{D~yDulDh}Fi|B`lD_vDl_FmrE~dFsnAn_E{gEhcOixChyIs`D`|L{~AzeHktA|jEgkF`eGm}A`hCmoB~dCweHhkBqoMz]kpOgMmhIkTsuAxqFiuBbiF}y@|bFedDhqM}lB|fG_MnzBk|ApcF_`AxzCytBdxBoeAd~AeuBva@ykEkZm_Bhg@kiBlfBuqAp`AyxAvuB_{EprFqjJ`lGm|C{t@{gBgL}yBbPo_Eiw@ydJwBaoCaTwpEbHqwCcv@myExu@mxLuqBwbFjIa{Cqf@ovC_fAstCjBooCa\\izDsrAk{Dm_BaqF}TeiF~M_aIlhDoqFq|AolFcZsnH}bCmpD}_B{vEqf@qyDv^_tIzCkwEtl@shFaLsiCxWskAkOwnFzNwgEtQemC}OeuCyV_wAhWqaDhmAetEjoFisDnlCqiG`WkhJrGoyEroAwtF{M_zF~iAsmDdqBanEoDchBaAenCd{@qiGzeDw`Cr_AkeDzy@wyBoM{GzuAg}@~xCy`@noEgwArkKkz@~dKugAvnKlD~gIsXjsEkW|bWf]ntFwWd~Kg[n`@qmGsGadNonAquEh_@qlD~M_rC_b@_sFcBgpGvl@y~HqEgkFta@qyChAw_DxyDo{ArtBg}Cpt@e_Gq^ofEjh@{vHmNioEoi@mcEhUk}H|lGwlDl_@a|F{CyuGvvBiuGhtCiyGjiFuoHjlEsoIb{HerFxyGudEpvDwiErhB}gNjqEqzBduCeyBfnF_eBj}DceC`qCcvDtzAyzE~lDc_GddCo|C`p@ioDay@wqCaCcqKtUckB|_A{yBtmD{oDj{Bw{Gp}AipI`tFk_FtjDaqInoC{aJppAypFvwBgcFl`@}mHnc@oqD`@_~Eo}DyhBca@oxDheCyyBpgAo~A}CebAc_@wp@b~A_cCnqI_cChfEwhDzuAgeCpvCinCfnLmuA`nIqb@nUcmNpdAozKg~AktCiqAi~Fuq@oqGkcAyyG|rAyrGdpCutDbRmmDna@ckCed@_x@kx@cq@fp@wzGbyD_dAj|AgqBvpGcqBboEayCdoEwvHb_IgjGloJszCb|CkkDjnFc{CjnHk{BdAcb@vJ_JroGkLplAglAnAmjC{NqCfxDhBtmJpNtr@??pR[xEMnEM?NQbEI`CQbG?pF@^LdLJvH}@@uEF}@BQDe@FeFTwAEoBQgE[wCS_AGgDEAiA??fn@jgE~|Dvp@|lVdY~{b@jtBhmTlyGfeb@}`Ap|c@nqCl_f@poKv~N|eTzrPrdLh|TbaWhuW`jWnhb@tsPbiU|qGtxO}p@je]gmHp`Ux\\`iLizJvjFstGf|M|kDr_\\tkXxna@x`O|pYraLxh\\`vUliLrzGhlUzcRnir@jsSj}k@vnEb`PahBtlMavFvjLhp@jsN`tF|zYhyOfya@ptPhgS|}DtuMt~P~|Iz}MliNxtFr`b@xxJ~je@vhK`ng@bnK|tw@|_AjkXlzj@zgWx`Pdm_@ziKhtJzmEraJxqPjlHjnQaXtsIzhA|kMzeIxrNnbIpjTj_f@zwU`mj@~~f@~{P~uQhrGfpP~tMfoc@`wRjj`@|fU`qF`bx@pqw@zoTn{ZvlWhiS|iG`aDryGufBdrNrxCdp\\nfCrdXf~BnmV_i@jw\\shO~nXqsSdd]izKdmQamCzeR~cB~|OdgGpvQjhCxyb@~Jxq\\~xDdr^zfCpjNmB`nPadB~wHy|CvyGldDftSr|GntRtbBxqUxmHj~Dd}P`bVpwZzee@d~Kl_a@hrFxez@||@n|K~[~dMozD|qTroDxqCn_HmaDf|P`cNvyLxuThzV`gXnsp@j|Otas@mVtlWduJfnVfdGpbXdx@~mHnxI`_N`oMrtNf{Dl|Qrl@hbf@kT~vf@nQroPbuIfbL|lWzxKvdTf|CflJ~hh@jhA~{LfyGznCl|I`sIbhIhxEh`C`dK`aQuFhkPza@`bGx@ncGpqGldQf`IhaI}k@r{DjoBp}FfeMbbH|pRpsMfsOlpJvaD~yM`_G~`NdvL~nNl|Ej}N~~KjcC|xHzuGfxSnwHndTbmGrjKtrE~vQxv@`}YtzFdip@vy@hk[ubM}uA}yCb`DqsB`tGdyBxuGlpDn_NsK`pYd}Q~eU~zAbePz_BbkJ{mDfzCuTdpIerC~}MVrmHlaG~uOg|Cj_JenGr_EonGptKncSbzl@deQlhY|vOpd\\lgSjn\\`mJ~`J~jZn|_@lkFh~H~yBbeHn|DltG|bAlpIkhDzuCk{BrsLhmDzxE|rGhpRpuMdrNvfFvbNmAhdFwfIvi[_`@hhu@rfHhoVfeDtiLrhGlnF`tLhqLodBxaF{sGdgSr|A`ln@dpExeNxr\\p_G|iOcyAx}PwZpcPcb@r~IdnHbrg@bie@fsJhmPdhAb_R~`EhuUznQgf@t__@qlGfsk@csGbj[_hJlkSjkBlaTpiFbxVhyOpc]neCplGf^~hJ`wDpkAolAts@^zoWpc@hh@q}AvwwDlxhzAAHgv@arBe}@ic@_xClaEuzA|uEglBja@ap@ayAspA}zCwzDem@ymObnFij[`_LkjHzaBmfHrvE}dHlxBqaGfzE{uKb_IisF~{ByxAne@}g@~wCdEhhDgdA~jAakAjcGp`@dhF}qB`}FsiDfZsnBb|Dc{LroXocIfrTuq@vmEecDbmHurAda@enApfEugAjnEicGxyMgiJbtQmlFdyOc|DtcG}aD`jKuyAf_GeoBbqBu_C`mHabChiF{hAtfDm`B`kBsGxjBlo@~qHuAdeFuzDjqNsjD~wWqtBdwGko@lkHu{Dd~XciDzzV}kBhpK_vEvgKadHzoNugFj}J_lEduOypAvoIy|BtfGy}ArbI_jElrHi`GryOu}BhnFmfCb`CwuFbuH_uBxeBcuB~kCsmAf}Es}Cz`HamDdjLilArxAoiBtLcTtlCkxArxAgg@dtCy`BbzEinBhnDw_CffJciKlph@mkFvgVmpHnqVgyKrzY}`FbvNwu@fwEe}DzvCbDluBckBdb@gcGbjIglFhmFwbBju@eeB|kCoz@tuEeCdwJuf@f{HwnB|cLa`G|lRq{EvzI_gEtoEenKrmQagI~fM{qB`~IyuCvsFasE`~Tmr@n|Lwz@vsRei@`yPpwAlwK_b@`vHv{@jlGsGdnIamBhkGy\\fwFnEbnEa~AzlJvaCfpMby@lgGkEzqFoz@vjOeYdsH{hBdoHyiEptSoqEltRmeAhxHyn@daBqvA{KknCxhCy_EjYq|DdoHcmBf{NuhFt~F_pHnqH_zAbpFt@`rGhrDl{Iw{@noLk{DhuM}`@zcGv_CfvG~w@rfBop@zlBelAfjKe}Dx`GwwDrgJybKr{VyjGlpMkzA~yFq}IdrQqxEdnLmhFbuJ}bCduHmpCxrAqmBt_Fo}E`rHscE~hEcnFviJy}HleJayVv}Nw|JxoDs`QxaNiiAvkBjt@dmBymF`{Qq_BtdFcFlqD~yF|dK|NzmG~pCxrLldAjlEaM|cFfz@r}DcR|jEf_AfrElw@j`Cc@~_GzJbfHb@~gF_u@zmGuqBrcJyhDf{Fm_HncJ_ZjeBstAb_Aar@bjCu`AnmFqkEj}GudDlxJygHnwJgfCh`FmkExjFkiDxpE{sG|sFw}FdhMgqCbq@_aB~`Eo_Fb{JaeGxrFerNhuO{kAnbAuDl`BfUhdMhS~mGcnCpsIwbBjdLg_AdgG{wBr_I`DdoQcp@|gN_}B|}Dqv@xlEixFpnHchFzcIcY``B|dBriB}wB~lDaRzdC_gA~hA??pA{Bf@w@h@m@lAaAfA}@~AiBt@aAl@}@Ni@CCCECOBOHKLED@hA{D?UAuAKuBIcAUyAM_AOiAI[Z{AVBCaB@gADcA@KDE?s@y@@aB@IEE?C?]COKCGGQIAKEKGQ[Co@@_@CI[a@BwAwACwCE}D@uG@k@_@WVGDM?wD@iFIg{ksAtujjHn@EdJhgC@rAGvCs@xDwBjJc@~BGt@IpAOzB]bKMvGI`IKbDCd@GJQxAYdCKb@GLw@nHUbGEbEDdDFlARdB^vB|ArEh@zAd@fBb@tBv@fF^fE`A~N?`@NlDF~A?nA?nBDd@Lb@JLPJNB`@ITSLULw@_@oEk@sEIu@Os@_AaMWyFIaAOmA[sAkA}Dm@eBkAcDa@yAQ}@Q}AS{CAeFLgFZaE^eC`@iD\\gFF}ADyDDyDFoBTsD\\mERmFPyCr@mEJoB@iA??SkEMuHOeDGeC?_@M@LxHDdCHrC?dAGvAWrBa@lBa@lBUbBQvAM`B_@tKGhG?rBChDKvEWbD_@`Ew@nHUbGEbEDdDFlARdB?ZFbARtAAh@Kd@GPUPUDWIkDDwFDIAIE_@?{@D}DHaBFOKoC@mABUFOJUZSh@?f@@ZGtEE`BKl@IZc@r@oAxB{BrDuB~CuBrDyBpD{@tAwCzEkEbH}A~BgC|DC@C@OPEP?J@BOPqDbGsBbDgBxCmEpHiBrC_IpMkAlBSRe@p@qDdG}GxKkDfGeCrDuIfLaGvHgG~Ho@t@q@t@mAdAi@\\_Ad@oAh@cBn@eAVmFzAmDlAqDpB_BhAcBpA}A~AcBpBmAdBuAnCkAnCmAtDiAxEUbA]bCYrBYrCg@|Hu@xQG|@q@|I[pDu@nFe@jCWhAWbBWhAs@pCqA|EuAhFuBbIiAlFq@dDm@nEcAtJg@zG]hHk@dK??mhBvvVbl@t~NquG~hLdeAlsSzxElsIibDv}NwcIj_i@gdJbeJodAhhHmaDn_^enU~hk@uqRfdi@}vAziSi_E|jTezElf[}yKrp]}rMvwr@ym@~|K{|DlkCjmAxeUuiIvhe@inSva^_vGdlM}yFhiUojFzvYseJnui@}jQn{a@gmMrdg@mqCbna@jRbvx@zq@j_b@ioBzcZacFjjMi~I~z_@mgDnpYn_@joLenD`kIwwRhcMehRpi^qnG|zUocGh{PwjJpVk}@ldDqcGvwTaLxyFhfD|~CsnFjnJssM`rTknMxjZajE|`Em|BxcJgmDzgFm|@xdMu_Wpt]alHfbB}}DbmEqaBniQu]`fNgpDnfTm_KjgPuy@tgGzFdoGbmCzrE}nGvah@{rD|bDwiIxj@q}MpzIinK~aNevJb`T{~RjfHy_DrwMgoLrz@u|ExyAmhKjgCw|Ej|NyrHh~FenRzgVmeDzoD_oHxx@kxWt{B}q`@pmL_dNpjG_oBdnVj|Bbr`@mfDlnHqjNttEaaNzvKszLnuYarBnw_@ueIf{[{qSrflA_pG`g{@q]n~iAuExxZ_{I`jZwl@~bb@}tL`n{A`iDfn|@azFxv[qdEjgUyXzq\\kJnmW}mLhq\\i}DzkUwmKhrNieJdxNkcBr_F_gMvpZczTvcTe`EpfGms@`_OqbKxvOo}Gjp\\~lFhmIbdAdl_@uzE|wPqjQh|d@_wElf_@xp@p{W`jF`dK``E|sLyyA~kKq~Hv`YwsCznZ_}EjqYseC~mYqoGhwSxV~{MrvGp_ThyG~qFlgIlr@dhHcgEbvEbwG~wEpuFoIddN|}ErmUbjEhcF_hBtdRpoAluSk_Svle@}pP`tt@|aL`_n@``Ftmo@|hi@jc|AeyAj_R`oEtgQflLvwAbgFf{HhrCl~TtwB|r@~{H|xCn_GxeU`aKtyHpvIa@vvLlIvwK`hH|pStqOdbF|yIpsGt~AbmXjqGv`PbgMb}TjeOtwAldHdyGnlJfqNe@~xJkMh}I`rJvqFnfBb}Jus@xaI~s@jdQmdHpaPbwDbmDm}@t_L~fG``ItzCpoJ{xBpkDabHuiAwjMdpD{wRvaBkwEnvIwqFn{Vyn[xhF{vVv`FmrFbpKhaBl`Qwq@`_Y{vOx{l@wzU|zIwhLbbHfVblM}bJn_F_|LbqDqxH|zCckAjeWstFv`Lw}Xv|O_}MhhHkq@bhGgqErtMuiPtjGilAvgN|cHdpM~iF`_Fya@faFwnJjfDmm@bgBnmK`|@h{G??[kpCmjBcxIqoAcdGe}EroDwrE~dJg_Iab@arG}qDkkNscJczEtyAc_EthAuwFfdGwjFhaJg_FnrCogJrdAqbHddGibCf|IojGpnLk}C~eEgiMx`DwpKjjColB`Oeq@tzCyzDbjK}rGv}LgnEbgAudCcYqzGdiCcuJhiK{tS|_IayM`_E}xNnrImzI`tHogG`o@w}Q`j@weC{{@}qEkJuvEhpFk{EvqUwkHj}LgqKp|KedKz}E}nBrgH{aClxF{q@zzJ`sAf{LmiCnhHanHfjBkhE|Zy~CydCakEseAsyE}vCsfBonAi~BdpAecHu}@ywEyv@izAazAmjDbt@ajLtzF_oC{B}|FcRmbDzbAitGqpAc`BmiFmdGq~DcqKpTioIssAayE~jFmuMbth@{sHhjZsaHnpE_gSlc`AmoRhjy@}jCdaZ{rFv{RmaL|n]ilHjoLcqF|pFk{NhbUmgS`}Zi~M|j[ugF|_IkXxtQi`ErcOs`Jjc@mmChnAwnAxiEj}B|p`@pgCtkT_N~`Xve@|kg@zcDfgd@diIrzOdMvlNetEneNm|@dpYseCqOcxE|gBkzHfQ}tKfuH_a@nrEmdCf`B}wFdzG_yD~mBc_Eh@qnC~~GjhA`l^aEt_SluDfnU`aA`pHu}@xkKqrEbtL{iAzkFicC`zG}nEzlBe|@j\\_dOzyReWz@uCvxA`fA|aImwBd`B_gB~`E`s@ndAzp@h~Fi`Ex}H{|Oh{CsyFjfMfa@jbZamNnePmiE`bQdoFvfQptB|jW~pEpmQpiDteAesB~oIynCxaBc|B~|DqwFllB}p@buJbr@vmLnjBtyDfv@deNxYbsFzzAv_EnmDn`OliA`{No|Cx{BmsC~g@o~IivBi}Dvn@cnF`iEuaBtyJ{~@~ze@}hDzkSydEnzCueAbvFmpBxPkuDqgCejMgeDquL{yFu~BlwBokDXosIj`GujQhpCmrKlmAapMpYcdKyQmuIa{DynEcyBejAfa@_tCx~Fgo@faJ}zEtgDygBvwEw{Edp@q_HjdGupBx_JmcFzeIuiEt|FcvFnfCidDxmF{iE~|MaeFf|GkdIvkUwjEtxXux@d}OsjNllNcmIlo@woE|mH{}KxlXkxBaEoeAvpE_oBjiEcmD~nFybEtoEmZ`gImgGfic@ijAjrJ_zDvbI_pWr__@{xOxvb@iwOrf[wdQfs\\urMf|GqjItxE_oJ`oAidJd}FavGvbGobI~pNkvBhgC_bD|{@_sJq~EmpEn}@wrCxnNewBwmD??aFsHU]aAqAeEcEKE_CyCIU]g@i@o@k@u@eC_DsAeBTa@n@kA|B_EXUd@i@`@u@??oG`KuN{BSE_AhBIdVg@tAud@dKiA@cAh@uKxAmAhDzArYt@bXu@hCwIuCsZk_@cSiJwQaUqv@qmBm`@{mAaImb@o@mn@w@maDMmTigChKyY`@{HaJaMov@mNmaAoBqr@_DymA}P_oAs\\c}B_Vev@{}AsmDy|@m|AyjB{{Cs`BqdBa|Aip@w`Ban@odAo^ql@gOc`AiXqnB~C_qBvF{n@sFoy@sVg{@qLul@_\\w_AapAemAyaB{e@yi@eWcIi\\cAk_@ePwa@cQy^nBw_@bHaTqCy]cSip@yg@m]mk@uP{o@uv@}oBkf@is@m}@meAmbAs|AedBm`Ayg@{V_]_@ct@pUadA~O}d@pY{TnEmr@aK_p@_RauCacAo`AiQ{aAkEe~@nCsbA~UiwA~^eb@bC{}CgLy`A_GwfAy_@aeAsi@ax@mPyoFaq@unBk]gr@eRetDkoA_aC}y@muAw[a`BqByn@{@am@sI_mAwWgfBkj@aeAaWwe@@snApAerAcAwlDuoAyfCut@sqCsk@klAkZe}@it@mo@u]m|@s]e{Auf@yvAiNgpCsWqfAkLwg@qSq{@yh@ir@{JmdCcKqcA@ivAkLiz@a]ayAos@izA{k@kgA_I}{@}\\_p@yRgn@r@ghApe@ia@jMgkEna@mwBmHeyBKq|ImQws@|Cw`AlVs{Cv`AibAtWgg@pDej@aCyd@oKc_Aoc@_fC_tA{nCwyAyPwNsOqb@}RwOcOxHuFjY{D~~@_[ncFmV`pBkUxdAgt@~pBe}@vvAkwAlkBqf@bq@eh@d^gy@~Hqb@`@yd@|NcRzTycBdmCuxAndBol@`h@ie@fW_}@nU_zBdH}u@lRmt@dq@}h@rqAea@znB_RhdAoKznAmUz}Cu[peBau@lfCqwAz_DsNxz@eDjoBv@zjBgI`|AwRzjAcR`p@eZx`A_QjeAaPhmDeJzs@g]fsAmy@p}A{x@vs@sx@ht@ij@v_A_pA|mDs`AnbB}h@rcAsZrx@k_@xs@_a@dd@}_Ajg@y`Anm@ixAxqAan@lp@ed@rs@c{@j{BcxAriEyxA~bCm{@fmBi]hc@o_@xYio@zUkp@zQ{o@tZ}fAv]kz@tTc^l\\_LpS{Z`kAwJ~_@mo@dvAek@pk@cz@vk@m]da@am@jpAyZje@y\\pQcc@jLmd@rc@_n@v`@etA`hAs`@bc@}M|]sf@vmD}tApkEy`@nt@si@fg@kRzDqMeC{HjLYbJlO|fApAd[q]hbAkEtIkOeDqQjAgEtBlDz@XyCdGcA??jGMfDf@dJfCXKXPXz@LTn@BR]@Mp@?pDNhDp@nCtAnB`Ev@dG~A~Yv@tXg@xOyCvVy@lLInMXtc@k@fTu@zHiDnTiDrRqErWeDvTmAdLwAzW[zHK`EmAnIaD`Li@pEOfG\\`FvAtE~BhC~Aj@jBBnCeAfAkAhAcCdA_HjA}[l@_Hd@mA`BuBjE{EbJuJxAaAv@UbBGjBPvNlBl@h@JjBGdAWVC?ZJEhDEvAHZ`A\\AF?NJZRBNWr@s@ZkAh@e@ReBfDVhBC`@oADS`@~@`@e@ZGn@Ax@b@|DlKxArDg@|@m@lAi@~A_@tA_AtDu@|CI^fCjBn[zWdQjOjCvDpBlE|BbHtCfN~@dK\\bR[fLs@xGaDtLaD|G{BbDcGlLiMtc@mEzOgeClxKsy@lvDa|@j~DoaAhhEqkBtiI_t@n`DkZvnA}g@vwBqSl{@_HrV}Qto@oSjp@es@rfBo}CryHybBlbEqr@nfBia@dbAyJ`VgEzOyXbbAkRlr@i]xtA{Tz|@yHb_@cJxo@wKb|@eGve@iFvc@yCl`@_Cpd@gAlc@Otf@Xb^lBfj@tAnXrBdWbGjk@|Kxr@bW|zAxRzlAxDf[`Dv\\dEfn@jFfcAzBbg@XhJAzOAxMPpF\\bIa@oFAgAVe@ROp@BRv@R`JbCbi@fBt[~Crb@nCt[vBhZbAhZPhIObJoBpRM`JF~JGRwA?cACwEGo@f@o@_@J{Ar@_B|AmLbA{OZyFlAiMtAiL`C_JrBiHh@yCnBsO`@iKo@aNwDcTKiC@wAYkASmBIiC{@uGiBiIoDePeByQuAuTgAyWIkUJ}NOwX}@oMoBeKkCoHwDkGaGcGmJ}IoLcLsBaBkB{A}DgDy@[o@Pm@zAFnAHh@O^Qr@_BtGsH~OuI|N{C`D}I|G@RO`@YAGOoLpHcCtAqCx@[LCTIN[?IMgEf@oDQ}DyBkC{DyBcH_@BOi@UUm@GwV|Iw^fNsCCcGcCuQsHqt@_[ooAai@_KgEcDu@qB|A_BdDs@lAcCZcCTyAh@iC`CcQzPuCdBqT|MqFlD}DpAq@@kCo@gEsDeMcPcAy@yMkGkLG_CuAqHwDkA_AyFsMqDaJaAwEoCwMkBmFcBsC{AaByD}AmBJkHhB}LEmRk@gDGoAXs@T_DdCeJtIsHjH{IfJiCvDeCzC{@wAwB}AgBs@aBLAFEPVhCh@f@t@@z@UfBuAjH}Gr]s[pKyJxU{T`FgFlM}K|OmJvAiAbF}FbC{DrCkGnKg[vByFvVys@??xMa]Zo@Dp@aIhRwf@xvAyEzMwGvLoGhG}MhHy[nZ{}ApyA}Wh\\yWx^s^lj@ew@haAaNrNiJhHeLlDeQ|EeVjLiUrT_OxSqI~RgCzJiBnKsCx_@mArh@d@xg@xEn_Ac@xVyDb[uHbVsInNkRnU_S~YgOhVcWdg@sMj[aZny@sSnr@sGjV_Ib[iGhZ}Etl@gGb}@eFxl@uCbj@dCz{Ak@`n@sBhe@qDlY}E~SqSlp@eLvf@mPzdAsDxXNrBdA|EdHzNnEbQhB|Mj@zZaIroAiQ|pCa@hNZlTnAnb@An\\oA~[{Dve@W`Uv@zP`FvZp_@jhBzFxZfA|MT`R_EzaA_FzhAoAtg@F~qC?zqAk@tPmFbd@uSfu@gV~x@cPrf@kPt_@}b@x{@sMpa@uJji@if@rhBykAvmE{H|i@iC|b@[hb@x@p]dAbQhPtrAvRdyAdEhTrNpc@|LjWvLhUtHvU~ChQbBfRh@lXoA~c@{Fp~AcBpf@aBnQkDtPeI|ReHfJuMrJcS|PuLdMoJjFgMvCqJ`EeNfJa^bY_MrIwKhFeSfRmHlE{GhB{LxB_LlGoHnIwFrKgIjUoAlCyJxNw`@z^}QdPsk@rh@_JzLkDlGoEhJcHlJsN|M_IxQuBvKeAjMWxa@G`b@wCbv@wApaAoDja@aF~]wKxq@kOno@oE~`@oGnc@iKle@}H|`@iOro@gIte@iE`VwIx^a`@pdAsHdTcG`QkCbJoBrLgAhSAlDo@t{CkBtl@U`_@fBf^jNrgAdCrp@FlNZr\\bA|ZjD~h@hAza@M~YsCjj@aFj`@uOjcAiHje@cCdRgBbZcBtVsBxOsDzQkFfQmL`ViJlMaJtN}EvNeLro@_K~WuCrMwApNBxa@k@l\\`@x`@Svb@oB`a@_BlYiEb[wBdYaBv]qOzbAaHhc@gHfd@sEb[k@zKHxLzCpb@nExg@~GpdAAbIg@|HkBnKkXveAsInYkBzA_DVmHeC_HnAwNdGgOlHyF|DcIfGoB~@k@tAE~@nAbNn@hLjDjl@ZrHr@lCBv@OZhDts@IrSgBrWg@nQ|@hWuBjJQpJyBpPmBjHo@~KwExh@w@~O~BNVtDr@`EqArCkAhEEtDjC|P`BvKXbMq@dJmFjE}Nhe@cOfi@yHfOsHlUuSpt@{G|OsJnSuQvWaBzMWfm@yDt^qAvBHxBdAT[jCc@lByDdRmDfKNdGzC~RfGza@vBbOx@hBSrB}A`WNRMx@u@hl@aH|Ep@pECp@[`@YxA{BIqBVoBxAcGhTkCjGQA??qIl_A`SxuAhk@zeF~Bz}C`U`tFi_@|xB|TbbDkh@lxCve@tpE`HnhCy[f|C{Gj|KtE|fGxh@t_G}|@rwBs_@pv@qBheBay@~nGdLhnCts@laC`HlpBp`AlcEjv@ryArwBxxChqCxeIfnAvzD`]tvGxJj}Cle@pcCyVz`CeoA|fKulAjuC}o@dh@{q@jvAcNlxEoGjuDfCtgI__@`sJjYpwBdo@l}BsQjvGxb@~bJtTtxF}a@jxE_~BxjIigB|gG_eAbaAkm@zmCoi@tkEmy@ntD_RfgJceAjfJyH~tFurAriHi]zoFxs@`|BfR~nDz_BhgJjbBrpIhFtjJ|[jgIy`@deJgVjmC|]|hCzjAhoIdWxhIWzeHak@b`Fv@zwCaTryAmnEdvDyv@veAvJf{@nvAzkDjbCxnJlrBb{Ej~AdoBxWhtC`aC~sGd_@xhDjo@fpCdp@vsArlBvsA|}Bdh@tiBtoCdjAv_AvoAfZ|pD{N`iA}j@|cDh`BnpB~_CjyAOzu@btAxyCtmCb_J~rCvtAqEppA{`A`z@cGlbAzn@bfDxiDfpBty@lzEr`Dv~B|{Cj~AxlA|mCzjHxb@zzH`JjgC~w@xjCxeB|`KfvA`fH|vAxkDneDvcCfmGl`A`eChxAbjBx|ChdAn~Abl@|Sfp@j\\~oAz{@blCkSv_Ab[lxBhFjeCp`ApgA`yBtQ||B~TdQgc@`j@gg@f~Aur@lb@ym@lwBuqAbkB}RzpDiPp_EgPdjJJtyEuOd_Cd{@duEh]fjByG|bDgKhjBgs@dqAu}@ncG_NhfClOdjDwCbdCbg@dqA~q@tpDb~@jwEnz@fcC~UbgFtcBtyOfy@lmFlo@pxB~Ix{BbpChsFhiAr|E`NrnCaDh|Czd@puClz@lvCn_A|dAlk@prBoBthElOzpB|k@fv@dkBjsCzi@~lAh{@zk@t|An|BdU~lExuAd|AxnAtwBjgBd_EvhBrl@`eAea@boA~Ohr@~tAlv@vpKrW`aDfs@brEjStaD@|`CnlAleC|aArxBdfAtm@|i@jjCzg@z}BdaApaBld@z`C|f@~nBvw@fgDxo@pjBdhBdxBhgAhxBtj@b~Clj@reBp}@|jAdxCjfFvo@`yDd~@`rD|xAniH`yAzyJdVfqCxe@fk@zcAzHv_AluBdHrmC~o@|mAnvArhBrlBhzBpb@rgCxMzeBoQtqAnVnj@bcB|~AnP`dAvm@jjAlOhq@zArnAj^trDbPzmBzG~hBth@f{@ni@vkAzm@li@xudx@n{b`L}Zrh@mAoAk@g@k@_@i@Qc@Me@Cc@Ia@Oi@]{CyCaDaD}@yAqBqDUa@_@_@_DuCiAgAk@Wi@Ma@CCf@_AfP}@vPoAtUYvGKlBKp@KVs@`A{@jAsObSmBdCmDmFoCoE{DcGkB{CO[Dy@FcBLaC??LwBPe@t@oNd@}I?Oj@}Jn@_L\\kG}Ca@aEa@sBWWMsAsBMQWM[C{BO{AQgL}@kEc@eEYqD]uGi@_Fc@]Qc@AwBQmAKq@Ga@GsBMP}DL}EAsCJoBxBqNfAaGToBFgD`A{XbJgeAPeCv@kPRoAh@gBl@uAfFcI|DeGVi@|C{EJONITEVAl@HTHNNNRHZMxCUv@Wr@Gb@[lG[zICXUCoBWeGu@sDa@gEg@cG]wDKuDSwJe@}EWmH[}HYwDOgFMa@?uAFmBLe@@i@Ai@G_AUkCsAoAi@sA[uCi@q@MEEGEKEUi@Io@GYIMiEwCsAy@kGeEwH_Fe\\eTwBqAkBoAg@a@eD{B_C}AiK}G{HeFc@YaEoCkG_EyFwDwFsDyFwDuNkJ_CyAOOiFiDtJoZhB}FiCcB{A_Ai@_@i@]GIIUBa@Aa@KiA?Mj@kBxCsJ~D_Mh@gB\\wABURq@??eJzqBbr@zYel@n|CvRaB_bAbiA{fDthE{|B~jI{kEx~IggBx`A{i@fdBg|AlwB{PbvChPlbKp}BxdC`|@tt@qDbhBrU~cCoGzdCauArdLa|E`tFxDvwPvdBx{KbLlqE{aAvyCycAtwBoUr_Dwy@x|B`r@lvCqcAzsMfW`cMegAdlJxq@flDnFv|C}DtpBcfA|kB_kCtqAuz@~gAivApy@kuAxeBvyBhsG}kBzxKkqBj~Eo|FhoBux@bhH}~@fzE`IdtP{Th`Lyf@|hKn~AnfNv~@~hCoP|tBlUrcDpD`mKvD~rCyq@txAbU~pKjlBjrRvrBj_M`qBv~FmJpzBmlAlu@zLh}E|o@hvIoMzkEaaCh_Fo_@vpEzkAprHpWxkIjiAznEt`@|kKtSvaHps@pcGj[ncLgbDzoKioDlnDg{@t`Fq|@vrGmbBzxFto@lgVlwBlnH~l@dgDoJ~yAui@lxGwt@zoC|MppIpv@`lLcqAffFgl@b}EheBpoE~zAnbGx_AvgLloCt}HvtDljEjrDjjMFzpDa|@`rF_~CtyCmmAdnHubC`iFul@j{JvxDpeLfhBvaEdEluA`u@ffE`T`wB}aCpkFoK|xGgbAt_FvSd~CkyB`}Eoy@~dKcxA~qEaMpyCwyAnfCo|AplI_{Ip_NxIbvV}nCv`Ss|@nfIx[hdEyGxcG~dA~cHaHndCqiBxgCebAheB~FbsEw`AzdNkaAptOrxArnGqQdbGlGbtIszBtbUy@haEhy@jnB~W~qC}aA|{Epo@n_DebAhbDjf@psBbfC~|IahBj`Qiz@dqDti@zkF}xAztLzIvjRuApxI~ZprKdZptOtqAhbNiRjxLoEjgHtShtLb[njFrqBdaPhDlzEtz@jsCx`@buEruBpgGpkAzhMquGnpKq~E~cG{_Ef_CerB|fFiLlxTkAzqRiy@boYoXlhg@KpmHgmBrpEwkDzdMmw@tkHclAlfEuoBflGo~AvlM_jAnoFuH|hE}t@ruE`GlqGqn@fgClHbhDs[nmLtg@`dEbb@d~IvqBreEzsCb_O|aA|re@{}@jgS_l@pcQqmBnwYe~Bl}Qw|BbnSirC`uLmbGtsVs}G~_VkwDnoQozD`qLeaC{|Bg{DcdBudEjs@}qCnhDm}@jxDaMr`G_CzkFTzs@mcAl@}_Eub@_mIxh@mjC}jA}}BiGinDuaCazKtC}mEft@inHnq@mcG{v@gqIh^c{Dxq@cwLnJwpD_Dux@fqCsE|cFcx@fgBa|Bi_A"
 	var p = polyline.decode(path);

 	
 	var l = turf.lineString(newPath);
 	var options = {units: 'kilometers'};
 	var along = turf.along(l, distanceTest, options);



 response.send(along);
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
	//console.log(event.data.val());
	

	const root = event.data.ref.root;
	const userEvents = root.child('/userEvents/' + userKey).once('value');

		return userEvents.then(s => {
		  			
		  		let eventKeys = Object.keys(s.val());
		  		//console.log(eventKeys);
				let updateObj = {};

				// create an entry for each event the user is in
				eventKeys.forEach(key => {
					updateObj['events/' + key + '/athletes/' + userKey] = objData;
				});

		return root.update(updateObj);
		  })

});


exports.updateUserEventSummary = functions.database
.ref('events/{eventID}/athletes/{athID}')
.onWrite(event => {
	// console.log(event.data.val());
	// console.log(event.data.key);
	// console.log(event.data.ref.path);

	var athletePath = event.data.ref.path;
	// console.log(athletePath);
	const root = event.data.ref.root;

	const userActivities = db.ref(athletePath + '/activities');
	

	//return this userActivities.once
	return userActivities.once('value').then(s => {
		
		let activityKeys = Object.keys(s.val());
		processUpdate(s.val(), activityKeys).then(function(summaryData){
			let updateObj = {};
			updateObj[athletePath + '/summary'] = summaryData;
		return root.update(updateObj);
		});

		
	});

function processUpdate (data, keys) {
	var summaryData = {
		total_distance_meters: 0,
		total_distance_miles: 0,
		total_elevation_gain_meters: 0,
		total_elevation_gain_feet: 0,
		total_time_seconds: 0,
		total_activities: 0
	};
	var activitiesProcessed = 0;


	function getMiles(i) {
     return i*0.000621371192;
	};

	function getFeet(i) {
		return (i * 3.28084)
	};


	var promise = new Promise(function (resolve, reject) {
				keys.forEach(k => {
					activitiesProcessed++;
					if (data[k].type == 'Run') {
						//distance
						summaryData.total_distance_meters = summaryData.total_distance_meters + data[k].distance;
						summaryData.total_distance_miles = getMiles(summaryData.total_distance_meters);

						//elevation
						summaryData.total_elevation_gain_meters = summaryData.total_elevation_gain_meters + data[k].total_elevation_gain;
						summaryData.total_elevation_gain_feet = getFeet(summaryData.total_elevation_gain_meters);

						//time
						summaryData.total_time_seconds = summaryData.total_time_seconds + data[k].elapsed_time;	

						// count
						summaryData.total_activities = summaryData.total_activities +1
					};

					if(activitiesProcessed === keys.length) {
							
							resolve(summaryData);
						};
				})
		});

	return promise
	};

}); //end of exports.updateEvent function



exports.updateEventSummary = functions.database
.ref('events/{eventID}/athletes/{athID}/summary')
.onWrite(event => {
	// console.log(event.data.val());
	// console.log(event.data.key);
	var p = event.data.ref;
	var athPath = p.parent;
	var athletesPath = athPath.parent;
	var eventPath = athletesPath.parent;
	console.log(eventPath.path);
	//eventPath holds the reference to the event object


	// var athletePath = event.data.ref.path;
	// console.log(athletePath);
	const root = event.data.ref.root;

	const athleteList = db.ref(athletesPath);
	

	//return this eventSummary.once
	return athleteList.once('value').then(s => {
		
		let athleteKeys = Object.keys(s.val());
		processEventSummary(s.val(), athleteKeys).then(function(summaryData){
			let updateObj = {};
			updateObj[eventPath.path + '/summary'] = summaryData;
		return root.update(updateObj);
		});

		
	});

function processEventSummary (data, keys) {
	var summaryData = {
		total_distance_meters: 0,
		total_distance_miles: 0,
		total_elevation_gain_meters: 0,
		total_elevation_gain_feet: 0,
		total_time_seconds: 0,
		total_activities: 0
	};
	var athletesProcessed = 0;

	console.log(keys.length);

	function getMiles(i) {
     return i*0.000621371192;
	};

	function getFeet(i) {
		return (i * 3.28084)
	};


	var promise = new Promise(function (resolve, reject) {
				keys.forEach(k => {
					athletesProcessed++;
					if (data[k].summary.total_activities > 0) {
							//distance
						summaryData.total_distance_meters = summaryData.total_distance_meters + data[k].summary.total_distance_meters;
						summaryData.total_distance_miles = getMiles(summaryData.total_distance_meters);

						//elevation
						summaryData.total_elevation_gain_meters = summaryData.total_elevation_gain_meters + data[k].summary.total_elevation_gain_meters;
						summaryData.total_elevation_gain_feet = getFeet(summaryData.total_elevation_gain_meters);

						//time
						summaryData.total_time_seconds = summaryData.total_time_seconds + data[k].summary.total_time_seconds;	

						// count
						summaryData.total_activities = summaryData.total_activities + data[k].summary.total_activities;
				
					};

						
					if(athletesProcessed === keys.length) {
							
							resolve(summaryData);
						};
				})
		});

	return promise
	};

}); //end of exports.updateEventSummary function


exports.updateSummaryLocations = functions.database
.ref('events/{eventID}/summary')
.onWrite(event => {
	//console.log(event.data.val());
	// console.log(event.data.key);
	var p = event.data.ref;
	var eventPath = p.parent;
	const root = event.data.ref.root;

	const racePath = db.ref(eventPath.path);
	
	return racePath.once('value').then(s => {
		//console.log(s.val().path);
		var d = event.data.val().total_distance_meters;
		var p = event.data.val().pacer_distance_meters;
		var line = s.val().path;
		findLocations(d,p,line).then(function(summaryData){
			console.log(summaryData);
			let updateObj = {};
			updateObj[eventPath.path + '/summary/locations'] = summaryData;
		return root.update(updateObj);
		});

		
	});

function findLocations (distance, pacer, line) {

	var meters = distance;
	var km = meters / 1000;
	console.log(km);
	var encodedLine = line;
    var p = polyline.decode(encodedLine);
    console.log(p[0]);
    var l = turf.lineString(p);

    var p = pacer;
    console.log('pacer distance is ' + p);

    var loc = {};

    // calculate total distance in KM
    // calculate point along line 500km at a time, OR with what is remaining

var mainPromise = new Promise(function (resolve, reject) {
	

	var options = {units: 'kilometers'};
	var along = turf.along(l, km, options);
	loc.current = [along.geometry.coordinates[0],along.geometry.coordinates[1]];

	var test = turf.along(l, 500, options);
	loc.test = [test.geometry.coordinates[0],test.geometry.coordinates[1]];

	var pacer = turf.along(l,p, {units: 'meters'});
	loc.pacer = [pacer.geometry.coordinates[0], pacer.geometry.coordinates[1]];
	resolve(loc);

   });

   return mainPromise


	};

}); //end of exports.updateEvent function



exports.updateDailyPacerDistance = functions.https.onRequest((request, response) => {
 var now = moment();
 db.ref().child('events').once('value', function(snap){
    let eventKeys = Object.keys(snap.val());

    updateEventPacers(eventKeys, now).then(function(resp){
    	console.log(resp);
 		response.send(200);
    });
  });



});

//takes meters and retunrs miles
function getMiles(i) {
     return i*0.000621371192;
	};


function updateEventPacers(keys, now) {
var processedEvents = 0;
var promiseArray = [];

	keys.forEach(x => {
		var promise = new Promise(function (resolve, reject) {
			processedEvents++;
			db.ref().child('events/' + x).once('value', function(snap){ 
				console.log(snap.val());
				if(snap.val().summary) {
					if(snap.val().summary.daily_meters_pace) {
					var dailyMeters = snap.val().summary.daily_meters_pace;
					var startDate = snap.val().start_date;
					var mStart = moment(startDate);
					var elapsedDays = now.diff(mStart, 'days');
					var pacerDistance = elapsedDays * dailyMeters;
					var pacerDistanceMiles = getMiles(pacerDistance);


					db.ref().child('events/' + x + '/summary/pacer_distance_meters').set(pacerDistance);
					db.ref().child('events/' + x + '/summary/pacer_distance_miles').set(pacerDistanceMiles); 

				}
			}
			 
			 if(processedEvents === keys.length) {
				resolve('success');
			 }


			})

	   });
	promiseArray.push(promise);


	});
	return Promise.all(promiseArray);
};





