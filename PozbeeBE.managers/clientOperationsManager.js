(function(clientOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");

    clientOperationsManager.getClientSecret = function(clientId, next){
        database.Client.findOne({clientId : clientId}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult(result.clientSecret));
            }
        })
    }
})(module.exports)