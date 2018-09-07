(function(user){

    var mongoose = require('mongoose'),
        crypto = require('crypto'),

        Schema = mongoose.Schema,

        userSchema = new Schema({
            email: {
                type: String,
                unique: true,
                required: true
            },
            created: {
                type: Date,
                default: Date.now
            },
            roles : {
                type : [String],
                required : true
            },
            name : {
                type : String,
                required : false
            },
            isApproved : {
                type : Boolean,
                required:  true
            },
            phoneNumber : {
                type : String,
                required : true,
                unique : true
            },
            phoneActivation : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "PhoneActivation"
            },
            updated : {
                type : Date
            },
            socialUser : {
                type : Schema.Types.ObjectId,
                ref : "SocialUser"
            },
            photographerApplications : [
                {
                    type : Schema.Types.ObjectId,
                    ref : "PhotographerApplication"
                }
            ],
            photographer : {
                type : Schema.Types.ObjectId,
                ref : "Photographer"
            },
            profilePicture : {
                type : String
            },
            city : {
                name : {
                    type : String
                },
                placeId : {
                    type : String
                }
            },
            about : {
                type : String
            },
            funFacts : {
                type : String
            },
            rating : {
                type : Number
            }
        },{collection : "user"});
    userSchema.pre("validate", function(next){
        this.created = new Date();
        this.isApproved = false;
        this.roles = ["customer"];
        next();
    });
    userSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    user.Schema = userSchema;
    user.Model = mongoose.model("User", userSchema);
})(module.exports)