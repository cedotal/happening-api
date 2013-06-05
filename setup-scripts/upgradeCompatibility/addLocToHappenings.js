// set up Mongo connection
var db = connect("localhost:27017/happening");

db.happenings.find().forEach(function(happening) {
    var locObject = db.cities.find({geonameID: happening.location.geonameID})[0].loc;
    db.happenings.update({_id: happening['_id']}, {$set: {"location.loc": locObject}});
});
