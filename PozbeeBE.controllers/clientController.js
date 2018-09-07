(function(clientController){
    var database = require("../PozbeeBE.data/database");
    var clientOperationsManager = require("../PozbeeBE.managers/clientOperationsManager");
    clientController.init = function(router){
        router.get("/test", function(req,res){
            var phoneRecord = new database.PhoneActivation({
                phoneNumber : "123124124"
            });
            phoneRecord.save(function(err,result){
                res.status(200).send("test");
            });

        });
        router.get("/test/sxs", function(req,res,next){
           next(new Error("asdad"));
        });

        router.get("/secret/:clientId", function(req,res,next){
            var clientId = req.params.clientId ;
            clientOperationsManager.getClientSecret(clientId , function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });
        return router;
    }
})(module.exports);