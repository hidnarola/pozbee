var crypto = require("crypto");
var moment = require('moment-timezone');
var tzlookup = require("tz-lookup");
var request = require("request");
var fs = require("fs");

GLOBAL.randomValueBase64 = function randomValueBase64 (len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')   // convert to base64 format
        .slice(0, len)        // return required number of characters
        .replace(/\+/g, '0')  // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}

GLOBAL.Dictionary = function Dictionary() {
    var dictionary = {};

    this.setData = function (key, val) { dictionary[key] = val; }
    this.getData = function (key) { return dictionary[key]; }
    this.removeKey = function (key) { delete dictionary[key]; }

    this.dict = dictionary

}
global.METERS_PER_MILE = 1609.344;

global.instantRequestTimers = [];
global.scheduledRequestCrons = [];
global.NotificationEnum = Object.freeze(
    {
        "NewInstantRequest" : 1,
        "InstantPhotographerFound" : 2,
        "RequestCancelled" : 3,
        "PhotographerIsComing" : 4,
        "PhotographerArrived": 5,
        "PhotographingSessionStarted" :6,
        "PhotographingSessionFinished" :7,
        "NonEditedPhotosAdded" : 8,
        "PhotographsSelected" : 9,
        "EditedPhotosAdded" : 10,
        "NewScheduledRequest" : 11,
        "ScheduledRequestAccepted" : 12,
        "ScheduledRequestRejected" : 13,
        "ScheduledRequestCancelled" : 14
    })

global.getLocalTimeByLocation = function(location ,date){
    var zone = tzlookup(location[1],location[0]);
    var d = moment.utc(date);
    var formattedDate = d.tz(zone);

    return {
        dateStr : formattedDate.format("LLL"),
        date : formattedDate._d
    };
}

global.download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}
function isEmpty(str) {
    return (!str || 0 === str.length);
}
String.prototype.isEmpty = function() {
    return (this.length === 0 || !this.trim());
};