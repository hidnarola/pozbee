(function(scheduledRequest){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        scheduledRequestSchema = new Schema({
            requestDate : {
                type : Date,
                required : true
            },
            userId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "User"
            },
            categoryId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "Categories"
            },
            photographerId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "Photographer"
            },
            updated:{
                type : Date
            },
            sessionDate : {
                type : Date,
                required : true
            },
            hours : {
                type : Number,
                required : true
            },
            location : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            },
            willBeDecidedLater:  {
                type : Boolean,
                required :true
            },
            isAnswered: {
                type : Boolean,
                required : true
            },
            accepted : {
                type : Boolean,
                required : true
            },
            cancelled : {
                type : Boolean
            },
            expired : {
                type : Boolean
            },
            cancelledByPhotographer : {
                type : Boolean
            },
            arrived : {
                type : Boolean
            },
            arrivedDate : {
                type : Date
            },
            shootingStarted : {
                type : Boolean
            },
            shootingStartedDate : {
                type : Date
            },
            shootingFinished : {
                type : Boolean
            },
            shootingFinishedDate : {
                type : Date
            },
            userConfirmed : {
                type : Boolean
            },
            rejectionDate : {
                type : Date
            },
            nonEditedPhotosAdded :{
                type : Boolean
            },
            nonEditedPhotosAddedDate : {
                type : Date
            },
            userChoosed : {
                type : Boolean
            },
            userChoosedDate: {
                type : Date
            },
            editedPhotosAdded : {
                type : Boolean
            },
            editedPhotosAddedDate : {
                type : Date
            },
            userConfirmed : {
                type : Boolean
            }
        },{collection : "scheduledRequest"});
    scheduledRequestSchema.pre("validate", function(next){
        if(!this.requestDate){ this.requestDate = new Date(); }
        if(!this.isAnswered) { this.isAnswered = false; }
        if(!this.accepted) { this.accepted = false; }
        if(!this.userConfirmed) { this.userConfirmed = false; }
        if(!this.willBeDecidedLater) { this.willBeDecidedLater = false; }
        if(!this.cancelled) { this.cancelled = false; }
        if(!this.userConfirmed) { this.userConfirmed = false; }
        if(!this.nonEditedPhotosAdded) { this.nonEditedPhotosAdded = false; }
        if(!this.nonEditedPhotosAddedDate) { this.nonEditedPhotosAddedDate = null; }
        if(!this.userChoosed) { this.userChoosed = false; }
        if(!this.userChoosedDate) { this.userChoosedDate = null; }
        if(!this.editedPhotosAdded) { this.editedPhotosAdded = false; }
        if(!this.editedPhotosAddedDate) { this.editedPhotosAddedDate = null; }
        if(!this.shootingStarted) { this.shootingStarted = false }
        if(!this.shootingFinished) { this.shootingFinished = false }
        this.updated = new Date();
        next();
    });
    scheduledRequestSchema.pre('update', function() {
        this.update({},{ $set: { updated : new Date() } });
    });

    scheduledRequest.Model = mongoose.model("ScheduledRequest", scheduledRequestSchema);
})(module.exports);