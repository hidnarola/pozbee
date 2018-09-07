(function(smsHelper){
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    smsHelper.sendSms = function(phoneNumber, activationCode,next){
        next(null, operationResult.createSuccesResult());
    }
})(module.exports);