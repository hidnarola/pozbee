(function(socialUser){

    var mongoose = require('mongoose'),
        crypto = require('crypto'),

    Schema = mongoose.Schema,
    socialUserSchema = new Schema({
        userId: {
            type: String,
            unique: true,
            required: true
        },
        created: {
            type: Date,
            default: Date.now
        },
        link : {
            type : String
        },
        pictureUri : {
            type : String
        },
        gender : {
            type : String
        },
        facebookToken : {
            type: String,
            unique: true,
            required: true
        }
    },{collection:"socialUser"});


    socialUserSchema.pre("validate", function(next){
        this.created = new Date();
        next();
    });
    socialUserSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    socialUser.Schema = socialUserSchema;
    socialUser.Model = mongoose.model("SocialUser", socialUserSchema);
})(module.exports)