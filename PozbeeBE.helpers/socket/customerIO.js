(function(customerIO){
    var _ = require("underscore");
    var socket = require("socket.io");
    var operationResult = require("../operationResult");
    var database = require("../../PozbeeBE.data/database");
    var mongoose = require("mongoose");
    var async = require("async");
    var photographerOperationsManager = require("../../PozbeeBE.managers/photographerOperationsManager");

    customerIO.init = function(app){
        var io = socket(app);
        io.of("customer").on("connection",function(s){
            s.on("join", function(userId,cb){
                s.join(userId, function(err){
                    cb(operationResult.createSuccesResult());
                    s.emit("joinedSuccessFully", function(data,test){

                    })
                });
            });
        });
        io.of("photographer").on("connection", function(s){
            s.on("join", function(userId,cb){
                s.join(userId, function(err){
                    database.User.findOne({_id : mongoose.Types.ObjectId(userId)}).populate("photographer").exec(function(err,userResult){
                        if(err){
                            s.disconnect()
                        }else{
                            cb(operationResult.createSuccesResult());

                            s.emit("joinedSuccessFully", userResult.photographer.isActive, userResult.photographer.isOnline, function(data,test){
                                photographerOperationsManager.checkWasntAsweredInstantRequestOfPhotographer(userResult.photographer._id, function(err,result){
                                    if(!err && result){
                                        var userInfo = {
                                            instantRequestId : result._id.toString(),
                                            name : result.userId.name,
                                            category : result.categoryId.name,
                                            photographStyle : result.photographStyle == 1 ? "Indoor" : "Outdoor",
                                            pictureUri : result.userId.profilePicture,
                                            location : result.location.coordinates,
                                            endingDate : new Date(result.photographerOfInterest.askedDate.getTime() + 15000)
                                        }
                                        s.emit("newInstantPhotographerRequest",userInfo);
                                    }
                                });
                                console.log(data);
                                console.log(test);
                            })
                        }
                    })
                });
            });
        });

        return io;
    }
})(module.exports);