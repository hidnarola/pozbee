(function(photographerUnavailability){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        photographerUnavailabilitySchema = new Schema({
            day : {
                type : Date,
                required : true
            },
            hours : {
                type : [Number],
                required : true
            },
            photographerId : {
                type : Schema.Types.ObjectId,
                ref : "Photographer",
                required : true
            },
            expireAt : {
                type : Date,
                required : true
            },
            created : {
                type : Date,
                required : true
            },
            hoursFromGMT : {
                type : Number,
                required : true
            },
            scheduledSession : {
                type : Boolean
            }
        },{collection : "photographerUnavailability"});

    photographerUnavailabilitySchema.pre("validate", function(next){
        if (!this.created) { this.created = new Date(); }
        next();
    });
    photographerUnavailabilitySchema.index({"expireAt" : 1},{ expireAfterSeconds : 0})
    photographerUnavailability.Model = mongoose.model("PhotographerUnavailability",photographerUnavailabilitySchema);

})(module.exports);