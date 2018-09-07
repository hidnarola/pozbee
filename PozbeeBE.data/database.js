(function(database){
    var mongoose = require("mongoose");
    var db = mongoose.connection;
    var config = require("../config");
    mongoose.connect(config.get("mongoose:uri"),{ useMongoClient: true});
    // mongoose.connect('mongodb://pozbeeAdmin:1q2w3eCa!@138.68.23.202:15123/pozbee',{ useMongoClient: true});
    var db_url = config.get("mongoose:uri");
    // db.once("open",function(err){

    // });

    // When successfully connected
db.on('connected', function () {
    console.log('Mongoose connection open to '+ db_url);
});

// If the connection throws an error
db.on('error', function (err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
db.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
});

    database.Client = require("./collections/client").Model;
    database.AccessToken = require("./collections/accessToken").Model;
    database.RefreshToken = require("./collections/refreshToken").Model;
    database.PhoneActivation = require("./collections/phoneActivation").Model;
    database.User = require("./collections/user").Model;
    database.Device = require("./collections/device").Model;
    database.SocialUser = require("./collections/socialUser").Model;
    database.PhotographerApplication = require("./collections/photographerApplication").Model;
    database.Category = require("./collections/categories").Model;
    database.Photographer = require("./collections/photographer").Model;
    database.InstantRequest = require("./collections/instantRequest").Model;
    database.WatermarkPhotos = require("./collections/watermarkPhotos").Model;
    database.EditedPhotos = require("./collections/editedPhotos").Model;
    database.PhotographerUnavailability = require("./collections/photographerUnavailability").Model;
    database.Portfolio = require("./collections/portfolio").Model;
    database.ScheduledRequest = require("./collections/scheduledRequest").Model;
})(module.exports);
