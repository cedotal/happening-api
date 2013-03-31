// set up Mongo connection

var db = connect("localhost:27017/happening");

// delete all documents in the cities collection
db.cities.remove();
