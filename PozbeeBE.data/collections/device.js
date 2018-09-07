(function (device) {
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        deviceSchema = new Schema({
            createdDate : {
                type : Date,
                required : true
            },
            pushNotificationToken : {
                type : String
            },
            location : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            },
            lastUpdateDate : {
                type : Date
            },
            lastLocationUpdateDate : {
                type : Date
            },
            isActive : {
                type : Boolean,
                required : true,
                default : true
            },
            activeUserId : {
                type : Schema.Types.ObjectId,
                required : false,
                ref : "User"
            }
        },{collection : "device"});
        deviceSchema.pre("validate", function(next){
            if(!this.createdDate){ this.createdDate = new Date(); }
            if(!this.isActive){ this.isActive = true; }
            if (this.location.coordinates.length == 0) {
                this.location = {
                    type: "Point",
                    coordinates: [0, 0]
                };
            }
            next();
        });
        deviceSchema.pre("update", function(next){
            this.lastUpdateDate = new Date();
            next();
        });
    device.Model = mongoose.model("Device", deviceSchema);
})(module.exports)