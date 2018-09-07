(function(userOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var async = require("async");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var fs = require("fs");
    userOperationsManager.checkIfUserUpdated = function(id, version, next){
        database.User.findOne({_id : mongoose.Types.ObjectId(id)}).populate("socialUser").populate("photographerApplications").populate("photographer").exec(function(err,userResult){
           if(err || !userResult){
               next(err);
           } else{
               if(userResult.__v == version){
                   next(null,operationResult.createSuccesResult());
               }else{
                   var photographerApplication = _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                   var user = userResult.toObject();
                   delete user.photographerApplications;
                   user.photographerApplication = photographerApplication;
                   next(null, operationResult.createSuccesResult(user));
               }
           }
        });
    }

    userOperationsManager.fetchCategories = function(next){
        database.Category.find({}).exec(function(err,result){
           if(err){
               next(err);
           } else{
               var categories = [];
               _.each(result, function(cat){ return categories.push(cat.toObject()); });
               next(null,operationResult.createSuccesResult(categories));
           }
        });
    }

    userOperationsManager.logout = function(deviceId, next){
        database.Device.update({_id : mongoose.Types.ObjectId(deviceId)},{$set : {isActive : false}}).exec(function(err,updateResult){
           if(err){
               next(err);
           } else{
               if(updateResult.nModified > 0){
                   database.AccessToken.remove({deviceId : deviceId},function(err,removeResult){
                      if(err){

                      }
                   });
                   database.RefreshToken.remove({deviceId : deviceId}, function(err,removeResult){
                      if(err){

                      }
                   });
                   next(null,operationResult.createSuccesResult());
               }else{
                   next(null,operationResult.createErrorResult());
               }
           }
        });
    }

    userOperationsManager.registerRemoteNotificationToken = function(deviceId, remoteNotificationToken, next){
        database.Device.update({_id: deviceId}, {$set : {pushNotificationToken : remoteNotificationToken}}).exec(function(err,result){
          if(err){
              next(err);
          }  else{
              if (result.nModified > 0){
                  next(null, operationResult.createSuccesResult());
              }else{
                  next(null, operationResult.createErrorResult());
              }
          }
        })
    }

    userOperationsManager.uploadProfilePicture = function(userId, fileName, next){
        database.User.findOne({_id : userId}).exec(function(err,userResult){
            if(err){
                next(err);
            }else{
                try {
                    fs.unlinkSync("./public/" + userResult.profilePicture);
                }
                catch(err){

                }
                finally{
                    userResult.profilePicture = "profilePictures/" + fileName;
                    userResult.__v = userResult.__v + 1;
                    userResult.save(function(err,saveRes){
                        if(err){
                            next(err);
                        }else{
                            next(null, operationResult.createSuccesResult(saveRes.profilePicture));
                        }
                    })
                }

            }
        })
    }

    userOperationsManager.updateUserProfile = function(userId, cityName, placeId, about, funFacts, next){
        database.User.update(
            {
                _id : userId
            }, {
                $set : {
                    city : {
                        name : cityName,
                        placeId : placeId
                    },
                    about : about,
                    funFacts : funFacts
                },
                $inc : {
                    __v : 1
                }
            }
        ).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    next(null, result,operationResult.createSuccesResult());
                }
            })
    }

})(module.exports)