// set up Mongo connection
var db = connect("localhost:27017/happening");

db.happenings.find().forEach(function(happening) {
    var themeMatch = db.themes.find({_id: happening.themes[0]})[0];
    db.happenings.update({_id: happening['_id']}, {$set: {"tags": [themeMatch.name.toLowerCase()]}});
    db.happenings.update({_id: happening['_id']}, {$unset: { themes: ''}});
});
