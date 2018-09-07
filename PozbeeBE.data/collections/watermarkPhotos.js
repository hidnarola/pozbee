(function (watermarkPhotos){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        watermarkPhotosSchema = new Schema({
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
            isChoosed : {
                type : Boolean,
                required : true
            },
            choosedDate: {
                type : Date
            },
            path : {
                type : String,
                required : true
            }
        },{collection : "watermarkPhotos"});

    watermarkPhotosSchema.pre("validate", function(next){
        if(!this.uploadDate) { this.uploadDate = new Date(); }
        if(!this.isChoosed) { this.isChoosed = false; }

        next();
    });

    watermarkPhotos.Model = mongoose.model("WatermarkPhotos", watermarkPhotosSchema);
})(module.exports)