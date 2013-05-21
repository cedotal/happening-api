// set up Mongo connection
var db = connect("localhost:27017/happening");

// drop the indexes on the happenings collection
db.happenings.dropIndex('*');

// drop the indexes on the themes collection
db.themes.dropIndex('*');
