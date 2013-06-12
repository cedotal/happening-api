# script to get tab-delimited timezone files from geonames.org, process them, and import them into MongoDB

# get the file
wget -r -O timeZones.txt http://download.geonames.org/export/dump/timeZones.txt

# run the mongo scripts necessary to tear down the old cities collection
mongo mongoTimezonesTeardown.js

# sleep the script for 30 seconds while the cities are removed 
# TODO: make this reliant on a periodic check for whether all cities collections have been removed
sleep 5

# import the TSV file into MongoDB
mongoimport --db happening --collection timezones --type tsv --file timeZones.txt -f CountryCode,TimeZoneId,GMToffset1.Jan2013,DSToffset1.Jul2013,rawOffset\(independentofDST\)

# remove the txt file
rm timeZones.txt
