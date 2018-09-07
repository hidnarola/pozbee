(function (operationResult) {

    operationResult.createSuccesResult = function(object){
        if (object != null) {
            return {
                isSuccess : true,
                resultObject : object
            };
        }
        else {
            return {
                isSuccess : true
            };
        }
    };

    operationResult.createErrorResult = function (errMessage, exception){
        errMessage = errMessage != "" | errMessage != undefined ? errMessage : "Error";
        if (exception) {
            return {
                isSuccess : false,
                errorMessage : errMessage,
                exception : exception
            };
        } else {
            return {
                isSuccess : false,
                errorMessage : errMessage
            };
        }
    }
})(module.exports);