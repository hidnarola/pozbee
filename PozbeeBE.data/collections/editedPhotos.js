(function (editedPhotos){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        editedPhotosSchema = new Schema({
            instantRequestId : {
                type : Schema.Types.ObjectId,
                ref : "InstantRequest"
            },
            scheduledRequestId : {
                type : Schema.Types.ObjectId,
                ref : "ScheduledRequest"
            },
            uploadDate : {
                type : Date,
                required : true
            },
            path : {
                type : String,
                required : true
            }
        },{collection : "editedPhotos"});

    editedPhotosSchema.pre("validate", function(next){
        if(!this.uploadDate) { this.uploadDate = new Date(); }
        next();
    });

    editedPhotos.Model = mongoose.model("EditedPhotos", editedPhotosSchema);
})(module.exports);