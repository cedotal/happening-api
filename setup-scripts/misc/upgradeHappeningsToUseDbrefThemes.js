// set up Mongo connection
db = connect("localhost:27017/happening");

db.happenings.find().forEach(
    function(happening){
        db.happenings.update(happening, {$set:
            { themes: [{ $ref: 'themes', $id: happening.themes[0] }]}
        });
    }
);
