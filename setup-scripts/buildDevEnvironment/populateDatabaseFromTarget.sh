ssh -L27018:localhost:27017 root@somehappenings.com '
    echo "Connected on Remove End, sleeping for 10"
    sleep 10;
    exit' &
echo "Waiting 5 sec on local";
sleep 5;
echo "Connecting to Mongo and piping in script";
cat pull-db.js | mongo
