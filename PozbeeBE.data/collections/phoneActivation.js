(function(phoneActivation){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,

        phoneActivationSchema = new Schema({
            phoneNumber: {
                type: String,
                unique: true,
                required: true
            },
            activationCode: {
                type: String,
                max : 4,
                required: false
            },
            isActivated : {
                type : Boolean,
                required : true
            },
            created: {
                type: Date,
                required: true
            },
            updated : {
                type : Date
            },
            gotTokened : {
                type : Boolean
            }
        },{collection : "phoneActivation"});

    phoneActivationSchema.pre("validate", function(next){
        this.created = new Date();
        this.isActivated = false;
        this.gotTokened = false;
        next();
    });

    phoneActivationSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    })



    phoneActivation.Model = mongoose.model("PhoneActivation",phoneActivationSchema)
})(module.exports)