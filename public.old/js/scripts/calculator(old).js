app.service('CalculatorService', function ($firebaseAuth, $location, $rootScope){



  this.getDistanceFromStart = function(metres, encodedLine) {
        // first create a google maps line that we can work with 

        console.log(metres);
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

}); // end of service



  