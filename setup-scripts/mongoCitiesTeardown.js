// set up Mongo connection

var db = connect("localhost:27017/happening");

// drop the cities collection
db.cities.drop();
