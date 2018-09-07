(function(photographerIO){
    var _ = require("underscore");
    var socket = require("socket.io");
    var operationResult = require("../operationResult");

    photographerIO.init = function(app){
        var io = socket(app);
        io.of("photographer").on("connection",function(s){

            s.on("join", function(userId,cb){
                s.join(userId, function(err){
                    database.User.find({_id : mongoose.Types.ObjectId(userId)}).populate("photographer").exec(function(err,userResult){
                        if(err){
                            s.disconnect()
                        }else{
                            cb(operationResult.createSuccesResult());

                            s.emit("joinedSuccessFully", userResult.photographer.isOnline, userResult.photographer.isActive, function(data,test){
                                console.log(data);
                                console.log(test);
                            })
                        }
                    })

                });
            });
        })

        return io;
    }
})(module.exports);