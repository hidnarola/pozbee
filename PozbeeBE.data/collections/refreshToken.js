(function(refreshToken){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,

        refreshTokenSchema = new Schema({
            userId: {
                type: String
            },
            socialUserId : {
                type : String
            },
            clientId: {
                type: String,
                required: true
            },
            token: {
                type: String,
                unique: true,
                required: true
            },
            created: {
                type: Date,
                default: Date.now
            },
            deviceId : {
                type : String
            },
            deviceModel : {
                type : String
            },
            isMerchant : {
                type : Boolean,
                default : false
            },
            isCustomer : {
                type : Boolean,
                default : true
            }
        },{collection : "refreshToken"});

    refreshToken.Model = mongoose.model('RefreshToken', refreshTokenSchema);
})(module.exports);