(function(photographerOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");
    var watermark = require('image-watermark');
    var pathResolve = require("path").resolve;

    photographerOperationsManager.createNewApplication = function(userId, data, next){
        database.User.findOne({_id : mongoose.Types.ObjectId(userId)}).exec(function(err,userResult){
            if(err){
                next(err);
            } else{
                var categoriesArray = _.map(data.specialization, function(catId){
                    return {categoryId : mongoose.Types.ObjectId(catId), styles : [1,2]};
                });
                var photographerApplication = new database.PhotographerApplication({
                    name : data.name,
                    email : data.email,
                    zipCode : data.zipCode,
                    phoneNumber : data.phoneNumber,
                    categories : categoriesArray,
                    cameraModel : data.camera,
                    ableToRetouch : data.retouch === "true" ? true : false,
                    minHourlyRate : data.rate,
                    webSite : data.website,
                    phoneModel : data.phoneModel,
                    reviewPhase : 2,
                    isApproved : false
                });

                photographerApplication.save(function(err,applicationSaveResult){
                    if(err){
                        next(err);
                    } else{
                        if (userResult.photographerApplications){
                            userResult.photographerApplications.push(mongoose.Types.ObjectId(applicationSaveResult._id));
                        }else{
                            userResult.photographerApplications = [mongoose.Types.ObjectId(applicationSaveResult._id)]
                        }

                        userResult.save(function(err,userSaveResult){
                            if(err){
                                applicationSaveResult.remove();
                                next(err);
                            } else{
                                next(null);
                            }
                        });
                    }
                });
            }
        });
    }

    photographerOperationsManager.getPhotographerApplicationOfUser =function(userId,next){
        database.User.findOne({_id : userId}).populate("photographerApplications").exec(function(err,userResult){
            if(err){
                next(err);
            }else{
                if(userResult.photographerApplications && userResult.photographerApplications.length > 0){
                    var photographerApplication = _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                    next(null,operationResult.createSuccesResult(photographerApplication.toObject()));
                }

            }
        })
    }
    photographerOperationsManager.getPhotographerUserId = function(photographerId, next){
        database.User.findOne({photographer : photographerId}).exec(function(err,user){
            if(err){
                next(err);
            } else{
                next(null,user._id);
            }
        });
    }
    photographerOperationsManager.checkIfPhotographerApplicationUpdated = function(userId, version, next){
        database.User.findOne({_id : userId}).populate("photographerApplications").exec(function(err,userResult){
            if(err){
                next(err);
            }else{
                if(userResult.photographerApplications && userResult.photographerApplications.length > 0){
                    var photographerApplication = _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                    if (photographerApplication.__v != version){
                        next(null,operationResult.createSuccesResult(photographerApplication.toObject()));
                    }else{
                        next(null, operationResult.createSuccesResult());
                    }

                }

            }
        })
    }
    photographerOperationsManager.uploadDocumentsPhase = function(applicationId, cameraPhotos, location, backgroundDocs,next){
        database.PhotographerApplication.findOne({_id : mongoose.Types.ObjectId(applicationId)}).exec(function(err, applicationResult){
            if(err || !applicationResult){
                next(err);
            }else{
                var cameraPhotoPaths = _.map(cameraPhotos, function(photo){ return photo.path});
                var bacgroundDocPaths = _.map(backgroundDocs, function(photo){ return photo.path});
                applicationResult.cameraPhotos = cameraPhotoPaths;
                applicationResult.backgroundDocs = bacgroundDocPaths;
                applicationResult.reviewPhase = 4;
                applicationResult.isApproved = true;
                applicationResult.permanentLocation = {
                    type : "Point",
                    coordinates : location
                }
                applicationResult.save(function(err,applicationResultSaveResult){
                    if(err || !applicationResultSaveResult){
                        next(err);
                    }else{
                        next(null, operationResult.createSuccesResult(applicationResultSaveResult.toObject()));
                    }
                });
            }
        });
    }

    photographerOperationsManager.createPhotographer = function(userId, next){
        async.waterfall([
            function(wf){
                database.User.findOne({_id : mongoose.Types.ObjectId(userId)}).populate("photographerApplications").exec(function(err,userResult){
                    console.log('in userresult============>',err,userResult);
                    if(err){
                        wf(err);

                    } else{
                        if(!userResult){
                            wf(operationResult.createErrorResult(""));
                        }else{
                            var photographerApplication =  _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                            console.log('photographerapplication==================>',photographerApplication);
                            wf(null,userResult,photographerApplication);
                        }
                    }
                });
            },
            function(user, photographerApplication, wf){
                var photographer = new database.Photographer({
                    photographerApplication : photographerApplication._id,
                    categories : photographerApplication.categories,
                    permanentLocation : photographerApplication.permanentLocation,
                    camera  : { name : photographerApplication.cameraModel, photo : photographerApplication.cameraPhotos[0] }
                });
                photographer.save(function(err,photographerSaveResult){
                    if(err){
                        wf(err)
                    } else{
                        if(!photographerSaveResult){
                            wf(operationResult.createErrorResult(""));
                        }else{
                            wf(null,user,photographerSaveResult);
                        }
                    }
                });
            },function(user,photographer,wf){
                user.photographer = photographer._id;
                user.save(function(err,userSaveResult){
                    if(err){
                        wf(err);
                    } else{
                        if(!userSaveResult){
                            wf(operationResult.createErrorResult(""));
                        }else{
                            wf(null, photographer);
                        }
                    }
                });
            }
        ],function(err, photographer){
            if(err){
                next(err);
            }else{
                next(null,operationResult.createSuccesResult(photographer));
            }
        });
    }

    photographerOperationsManager.setPhotographerActiveStatus = function(userId, photographerId, isActive, next){
        database.InstantRequest.findOne({userId : userId, finished : false, finishedDate : null}).exec(function(err,instantRequest){
            if(err){
                next(err);
            }else{
                if(!instantRequest){
                    database.Photographer.update({_id : mongoose.Types.ObjectId(photographerId)},{$set : {isActive : isActive}, $inc : {__v : 1}}).exec(function(err,updateResult){
                        if(err){
                            next(err);
                        } else{
                            console.log('update result================>',updateResult);
                            next(null, operationResult.createSuccesResult(true));
                        }
                    });
                }else{
                    next(null, operationResult.createErrorResult("You have active instant request"));
                }
            }
        })
    }

    photographerOperationsManager.setPhotographerOnlineStatus = function(photographerId, isOnline, next){
        database.Photographer.update({_id : mongoose.Types.ObjectId(photographerId)},{$set : {isOnline : isOnline}, $inc : {__v : 1}}).exec(function(err,updateResult){
            if(err){
                next(err);
            } else{
                next(null, operationResult.createSuccesResult(true));
            }
        });
    }

    photographerOperationsManager.checkIfPhotographerUpdated = function(photographerId, version, next){
        database.Photographer.findOne({_id : mongoose.Types.ObjectId(photographerId)}).exec(function(err,photographerResult){
            if(err){
                next(err);
            } else{
                if(photographerResult.__v != version){
                    var photographer = photographerResult.toObject()
                    database.Portfolio.find({photographerId : mongoose.Types.ObjectId(photographerId)}).exec(function(err, portfolio){
                       if(err){
                           next(err);
                       } else{
                           photographer.portfolio = portfolio;
                           next(null, operationResult.createSuccesResult(photographer));
                       }
                    });
                }else{
                    next(null, operationResult.createSuccesResult());
                }
            }
        });
    }

    photographerOperationsManager.updateLocationOfPhotographer = function(userId, data, next){
        async.waterfall([
            function(wf){
                database.Device.findOne({_id : mongoose.Types.ObjectId(data.deviceId)}).populate("activeUserId").exec(function(err,device){
                    if(err){
                        wf(err);
                    }else{
                        var location = {
                            type : "Point",
                            coordinates : [data.longitude, data.latitude]
                        }
                        device.location = location;
                        device.lastLocationUpdateDate = data.eventDate;
                        device.save(function(err,deviceSaveResult){
                            if(err){
                                wf(err);
                            } else{
                                wf(null,device);
                            }
                        });
                    }
                });
            },function(device,wf){
                database.User.populate(device.activeUserId, {"path" : "photographer"}, function(err,userOutput) {
                    if (err) {
                        wf(err);
                    } else {
                        var photographer = userOutput.photographer;
                        database.Photographer.update({_id : photographer._id},{$set :{location : device.location, lastLocationUpdateDate : device.lastLocationUpdateDate}}).exec(function(err,updateResult){
                            if (err) {
                                wf(err);
                            } else {
                                wf(null, photographer._id);
                            }
                        });
                    }
                })
            }
        ], function(err, photographerId){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult(), photographerId);
            }
        })

    }

    photographerOperationsManager.checkWasntAsweredInstantRequestOfPhotographer = function(photographerId, next){
        database.InstantRequest.findOne({
            finished : false,
            photographerRequests :
            {
                $elemMatch : { photographerId : photographerId}
            }
        }).populate("userId").populate("categoryId").exec(function(err,result){
            if(err){
                next(err);
            }else{
                if(result && result.photographerRequests.length > 0){
                    var photographerOfInterest = _.filter(result.photographerRequests, function(p){
                        return p.photographerId.toString() === photographerId.toString()
                    })[0];
                    if (photographerOfInterest.isAnswered === false && photographerOfInterest.askedDate > new Date(new Date().getTime() - 15000)){
                        result = result.toObject()
                        result.photographerOfInterest = photographerOfInterest;

                        next(null,result);
                    }else{
                        next(null, null);
                    }
                }
            }
        })
    }

    photographerOperationsManager.checkIfPhotographerHasActiveInstantRequest = function(photographerId, next){
        database.InstantRequest.findOne({
            "photographerRequests.photographerId" : photographerId,
            finished : false,
            found : true})
            .populate("userId")
            .populate("categoryId")
            .exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    if (!result){
                        next(null,operationResult.createSuccesResult());
                        return;
                    }
                    var pRequest = _.find(result.photographerRequests, function(pr){ return pr.photographerId.toString() === photographerId.toString() });
                    if (pRequest.isTaken){
                        var obj = result.toObject();
                        next(null, operationResult.createSuccesResult(obj));
                        //database.User.populate(result.userId, {"path": "socialUser"}, function (err, userOutput) {
                        //    if (userOutput) {
                        //        obj.userId = userOutput.toObject();
                        //        next(null, operationResult.createSuccesResult(obj));
                        //    } else {
                        //        next(null, operationResult.createSuccesResult(obj));
                        //    }
                        //});
                    }else{
                        next(null,operationResult.createSuccesResult());
                        return;
                    }
                }
            });
    }

    photographerOperationsManager.checkIfPhotographerHasOngoingScheduledRequest = function(photographerId, next){
        var date = new Date();
        database.ScheduledRequest.findOne({
            photographerId: photographerId,
            sessionDate : { $lt : date },
            isAnswered : true,
            accepted : true,
            cancelled : false,
            shootingFinished : false
        }).populate("userId").exec(function(err,result){
            if(err){
                next(err);
            } else{
                if(result){
                    next(null, operationResult.createSuccesResult(result.toObject()));
                }else{
                    next(null, operationResult.createSuccesResult());
                }
            }
        });
    }

    photographerOperationsManager.updatePhotographersActiveInstantRequest = function(photographerId, locationData, next){
        database.InstantRequest.findOne({
            "photographerRequests.isTaken" : true,
            "photographerRequests.photographerId" : photographerId,
            finished : false,
            found : true
        }).exec(function(err,instantRequestResult){
            if(err){
                next(err);
            }else{
                if(!instantRequestResult){
                    next(null,null);
                    return;
                }
                var location = {
                    type : "Point",
                    coordinates : [locationData.longitude, locationData.latitude]
                }
                var pRequest = _.find(instantRequestResult.photographerRequests, function(pr){ return pr.photographerId.toString() === photographerId.toString() });
                if (pRequest){
                    pRequest.currentLocation = location;
                    instantRequestResult.save(function(err,saveResult){
                        if(err){
                            next(err);
                        }else{
                            next(null, instantRequestResult);
                        }
                    })
                }

            }
        });
    }

    photographerOperationsManager.updatePhotographersActiveScheduledRequest = function(photographerId, locationData, next){
        database.ScheduledRequest.findOne({
            photographerId : photographerId,
            accepted : true,
            sessionDate : { $lt : new Date() },
            $or : [{ shootingFinished : false} ,{ shootingFinished : null }]
        }).exec(function(err,scheduledRequestResult){
            if(err){
                next(err);
            }else{
                if(!scheduledRequestResult){
                    next(null,null);
                    return;
                }
                else{
                    next(null, scheduledRequestResult);
                }
            }
        });
    }

    photographerOperationsManager.cancelInstantRequest = function(user, instantRequestId, next){
        database.InstantRequest.findOne({_id : instantRequestId}).exec(function(err,result){
            console.log("result================>",result);
            console.log('userphotographer=========>',user);
            if(err){
                next(err);
            } else{
                var takenPr = _.find(result.photographerRequests, function(pr){ console.log('pr=============>',pr);return pr.isTaken });
                if (takenPr){
                    if (takenPr.photographerId.toString() === user.photographer.toString()){

                        result.cancelled = true;
                        result.cancelledByPhotographer = true;
                        result.finished = true;
                        result.finishedDate = new Date();
                        result.save(function(err,saveResult){
                            if(err){
                                next(err);
                            } else{
                                next(null, result.userId, operationResult.createSuccesResult());
                            }
                        });
                    }else{
                        next(operationResult.createErrorResult("Something went wrong"));
                    }
                }else{
                    next(operationResult.createErrorResult("Something went wrong"));
                }
            }
        });
    }

    photographerOperationsManager.cancelScheduledRequest = function(scheduledRequestId, next){
        database.ScheduledRequest.findOneAndUpdate(
            {
                _id : scheduledRequestId
            },
            {
                $set :
                {
                    cancelled : true,
                    cancelledByPhotographer : true,
                    shootingFinished : true,
                    shootingFinishedDate : new Date()
                }
            },{
                new : true
            }).exec(function(err, result){
            if(err){
                next(err);
            } else{
                var jobs = _.filter(global.scheduledRequestCrons, function(src){
                    return src.scheduleId == scheduledRequestId.toString();
                });
                _.each(jobs, function(src){
                    src.cronJob.stop();
                });

                for(i = 0; i < jobs.length; i ++ ){
                    var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                        return c.scheduleId == scheduledRequestId.toString()
                    });
                    if (index != -1){
                        global.scheduledRequestCrons.splice(index, 1);
                    }
                }

                var list = []
                for (i = 0; i < result.hours; i++){
                    var d = new Date(result.sessionDate.getTime() + i*60*60*1000);
                    var x = new Date(JSON.parse(JSON.stringify(d)));
                    x.setUTCHours(0);
                    var index = _.findIndex(list, function(d){
                        return d.day.toDateString() == x.toDateString()
                    });
                    if (index == -1){
                        list.push({ day : x, hours : [d.getUTCHours()] });
                    }else{
                        list[index].hours.push(d.getUTCHours())
                    }
                }
                if(list.length > 0) {
                    async.each(list, function (d, eachCb) {
                        var day = d.day;
                        var hours = d.hours;
                        database.PhotographerUnavailability.findOne({
                            photographerId: result.photographerId,
                            day: day
                        }).exec(function (err, unavailability) {
                            if (err || !unavailability) {
                                eachCb(err);
                            } else {
                                for (i = 0; i < hours.length; i++) {
                                    var h = hours[i];
                                    var index = unavailability.hours.findIndex(function (hour) {
                                        return hour == h;
                                    });
                                    if (index != -1) {
                                        unavailability.hours.splice(index, 1);
                                    }
                                }
                                if (unavailability.hours.length == 0) {
                                    unavailability.remove(function (err, removeRes) {
                                        if (err) {
                                            eachCb(err);
                                        } else {
                                            eachCb();
                                        }
                                    })
                                } else {
                                    unavailability.save(function (err, updateResult) {
                                        if (err) {
                                            eachCb(err);
                                        } else {
                                            eachCb();
                                        }
                                    });
                                }

                            }
                        });
                    }, function (err) {
                        if (err) {
                            next(err);
                        } else {
                            photographerOperationsManager.getPhotographerUserId(result.photographerId, function (err, userId) {
                                if (err) {
                                    next(null, operationResult.createSuccesResult());
                                } else {
                                    next(null, operationResult.createSuccesResult(), userId);
                                }
                            });
                        }
                    });
                }else {
                    photographerOperationsManager.getPhotographerUserId(result.photographerId, function (err, userId) {
                        if (err) {
                            next(null, operationResult.createSuccesResult());
                        } else {
                            next(null, operationResult.createSuccesResult(), userId);
                        }
                    });
                }
            }
        });
    }

    photographerOperationsManager.respondToInstantPhotographerRequest = function(accepted, photographerId, instantRequestId, next){
        database.Photographer.findOne({_id : photographerId}).exec(function(err,photographerResult){
            if(err){
                next(err);
            } else{
                database.InstantRequest.update({
                    _id : instantRequestId,
                    "photographerRequests.photographerId" : photographerId
                },{
                    $set : {
                        found : accepted,
                        "photographerRequests.$.isAnswered" : true,
                        "photographerRequests.$.isTaken" : accepted,
                        "photographerRequests.$.currentLocation" : photographerResult.location
                    }
                }).exec(function(err,updateResult){
                    if(err){
                        next(err);
                    }else{
                        if(accepted && updateResult.nModified > 0){
                            database.InstantRequest.findOneAndUpdate(
                                {
                                    _id : instantRequestId },
                                {
                                    $pull : {
                                        photographerRequests: {askedDate : null}
                                    }
                                },{
                                    new : true
                                }
                            )
                                .populate("userId")
                                .populate("categoryId")
                                .exec(function(err,res){
                                    if(err){
                                        next(null, operationResult.createSuccesResult());
                                    }else{
                                        database.User.populate(res.userId, {"path":"socialUser"}, function(err,userOutput){
                                            if(userOutput){
                                                var obj = res.toObject();
                                                obj.userId = userOutput.toObject();
                                                next(null, operationResult.createSuccesResult(obj));
                                            }else{
                                                var obj = res.toObject();
                                                next(null, operationResult.createSuccesResult(obj));
                                            }
                                        });
                                    }
                                })
                        }else{
                            next(null, true);
                        }

                    }
                })
            }
        });
    }

    photographerOperationsManager.confirmArrivalOfPhotographer = function(instantRequestId, scheduledRequestId, next) {
        if (instantRequestId) {
            database.InstantRequest.findOneAndUpdate(
                {
                    _id: instantRequestId
                }, {
                    $set: {
                        arrived: true,
                        arrivedDate: new Date()
                    }
                }, {
                    new: true
                }).exec(function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        var obj = {
                            arrived: result.arrived,
                            arrivedDate: result.arrivedDate,
                            userId: result.userId
                        };

                        next(null, operationResult.createSuccesResult(obj));
                    }
                })
        }else if(scheduledRequestId){
            database.ScheduledRequest.findOneAndUpdate(
                {
                    _id: scheduledRequestId
                }, {
                    $set: {
                        arrived: true,
                        arrivedDate: new Date()
                    }
                }, {
                    new: true
                }).exec(function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        var obj = {
                            arrived: result.arrived,
                            arrivedDate: result.arrivedDate,
                            userId: result.userId
                        };

                        next(null, operationResult.createSuccesResult(obj));
                    }
                })
        }
    }

    photographerOperationsManager.startPhotoShooting = function(instantRequestId, scheduledRequestId, next){
        if(instantRequestId) {
            database.InstantRequest.findOneAndUpdate(
                {
                    _id: instantRequestId
                }, {
                    $set: {
                        shootingStarted: true,
                        shootingStartedDate: new Date()
                    }
                }, {
                    new: true
                }).exec(function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        var obj = {
                            shootingStarted: result.shootingStarted,
                            shootingStartedDate: result.shootingStartedDate,
                            userId: result.userId
                        };

                        next(null, operationResult.createSuccesResult(obj));
                    }
                })
        }
        else if (scheduledRequestId){
            database.ScheduledRequest.findOneAndUpdate(
                {
                    _id: scheduledRequestId
                }, {
                    $set: {
                        shootingStarted: true,
                        shootingStartedDate: new Date()
                    }
                }, {
                    new: true
                }).exec(function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        var obj = {
                            shootingStarted: result.shootingStarted,
                            shootingStartedDate: result.shootingStartedDate,
                            userId: result.userId
                        };

                        next(null, operationResult.createSuccesResult(obj));
                    }
                })
        }
    }

    photographerOperationsManager.finishPhotoShooting = function(instantRequestId, scheduledRequestId, next){
        if(instantRequestId) {
            database.InstantRequest.findOneAndUpdate(
                {
                    _id: instantRequestId
                }, {
                    $set: {
                        finished: true,
                        finishedDate: new Date()
                    }
                }, {
                    new: true
                }).exec(function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        var obj = {
                            finished: result.finished,
                            finishedDate: result.finishedDate,
                            userId: result.userId
                        };

                        next(null, operationResult.createSuccesResult(obj));
                    }
                })
        }else if(scheduledRequestId){
            database.ScheduledRequest.findOneAndUpdate(
                {
                    _id: scheduledRequestId
                }, {
                    $set: {
                        shootingFinished: true,
                        shootingFinishedDate: new Date()
                    }
                }, {
                    new: true
                }).exec(function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        var obj = {
                            shootingFinished: result.shootingFinished,
                            shootingFinishedDate: result.shootingFinishedDate,
                            userId: result.userId
                        };

                        next(null, operationResult.createSuccesResult(obj));
                    }
                })
        }
    }

    photographerOperationsManager.uploadInitialPhotosOfRequest = function(requestId, isInstant, photos, next){
        console.log('in manager===========>');
        var initialPhotoPaths = _.map(photos, function(photo){ return photo.path});
        var watermarkPhotosList = [];
        var instantRequestId = isInstant ? requestId : null;
        var scheduledRequestId = !isInstant ? requestId : null;
        console.log('initialphotos============>',initialPhotoPaths);
        async.each(initialPhotoPaths, function(path, cb){
                var watermarkPhotos = new database.WatermarkPhotos({
                    instantRequestId : instantRequestId,
                    scheduledRequestId : scheduledRequestId,
                    path : path
                });
                watermarkPhotos.save(function(err,result){
                    if(err){
                        cb(err);
                    } else{
                        watermarkPhotosList.push({
                            _id : result._id.toString(),
                            path : path
                        })
                        cb();
                    }
                });
            },
            function(err){
                if(err){
                    next(err);
                }else{
                    if (isInstant){
                        database.InstantRequest.findOneAndUpdate(
                            {
                                _id : instantRequestId
                            } ,
                            {
                                $set :
                                {
                                    nonEditedPhotosAdded : true,
                                    nonEditedPhotosAddedDate : new Date(),
                                    updated : new Date()
                                }
                            },{
                                new : true
                            })
                            .exec(function(err,instantRequest){
                                if(err){
                                    next(err);
                                }else{
                                    next(null,operationResult.createSuccesResult(watermarkPhotosList),instantRequest);
                                }
                            });

                    }else{
                        database.ScheduledRequest.findOneAndUpdate(
                            {
                                _id : scheduledRequestId
                            } ,
                            {
                                $set :
                                {
                                    nonEditedPhotosAdded : true,
                                    nonEditedPhotosAddedDate : new Date(),
                                    updated : new Date()
                                }
                            },{
                                new : true
                            })
                            .exec(function(err,scheduledRequest){
                                if(err){
                                    next(err);
                                }else{
                                    next(null,operationResult.createSuccesResult(watermarkPhotosList),scheduledRequest);
                                }
                            });

                    }

                }
            });
    }

    photographerOperationsManager.uploadEditedPhotosOfRequest = function(requestId, isInstant, photos, next){
        var initialPhotoPaths = _.map(photos, function(photo){ return photo.path});
        var editedPhotoList = [];
        var instantRequestId = isInstant ? requestId : null;
        var scheduledRequestId = !isInstant ? requestId : null;
        console.log('initialPHotoPaths===>',initialPhotoPaths,'instantRequestId======>',instantRequestId,'ScheduledRequestId===>',scheduledRequestId);
        async.each(initialPhotoPaths, function(path, cb){
                var editedPhoto = new database.EditedPhotos({
                    instantRequestId : instantRequestId,
                    scheduledRequestId : scheduledRequestId,
                    path : path
                });
                console.log('editedphotos===>',editedPhoto);
                editedPhoto .save(function(err,result){
                    if(err){
                        cb(err);
                    } else{
                        editedPhotoList.push({
                            _id : result._id.toString(),
                            path : path
                        })
                        cb();
                    }
                });
            },
            function(err){
                if(err){
                    next(err);
                }else{
                    if (isInstant){
                        database.InstantRequest.findOneAndUpdate({ _id : instantRequestId} ,{
                                $set :
                                {
                                    editedPhotosAdded : true,
                                    editedPhotosAddedDate : new Date(),
                                    updated : new Date()
                                }
                            },
                            {
                                new : true,
                                runValidators : true
                            })
                            .exec(function(err,instantRequest){
                                console.log('in instantrequest=======>',instantRequest, err);
                                if(err){
                                    next(err);
                                }else{
                                    next(null,operationResult.createSuccesResult(editedPhotoList), instantRequest);
                                }
                            });
                    }else{
                        database.ScheduledRequest.findOneAndUpdate(
                            {
                                _id : scheduledRequestId
                            } ,
                            {
                                $set :
                                {
                                    editedPhotosAdded : true,
                                    editedPhotosAddedDate : new Date(),
                                    updated : new Date()
                                }
                            },
                            {
                                new : true,
                                runValidators : true
                            })
                            .exec(function(err,scheduledRequest){
                                if(err){
                                    next(err);
                                }else{
                                    next(null,operationResult.createSuccesResult(editedPhotoList), scheduledRequest);
                                }
                            });
                    }


                }
            });
    }

    photographerOperationsManager.getScheduledRequestsHistory = function(photographerId, skipCount, limitCount, include, exclude, next){
        var matchQuery;
        if (exclude) {
            matchQuery = {
                "photographerId" : photographerId,
                "_id" : {
                    $nin : [exclude]
                }
            }
        }else{
            matchQuery = {
                "photographerId" : photographerId
            }
        }

        database.ScheduledRequest.find(matchQuery)
            .skip(skipCount)
            .limit(limitCount)
            .populate("userId")
            .populate("categoryId")
            .sort({updated : -1, requestDate : -1})
            .exec(function(err, results){
                if(err){
                    next(err);
                }else{
                    var scheduledRequests = [];
                    async.series([
                        function(callback){
                            if (include) {
                                var includingScheduledReq = _.find(results, function (sr) {
                                    return sr._id.toString() == include.toString()
                                });
                                if (!includingScheduledReq) {
                                    database.ScheduledRequest.findOne({_id: include}).populate("categoryId").populate("userId").exec(function (err, scheduledRequest) {
                                        if (err || !scheduledRequest) {
                                            callback();
                                        } else {
                                            results.splice(0, 0, scheduledRequest);
                                            callback();
                                        }
                                    })
                                } else {
                                    callback();
                                }
                            }else{
                                callback();
                            }
                        },
                        function(callback){
                            async.each(results, function(scheduledRequest, eachCb){
                                var sr = scheduledRequest.toObject();
                                async.series([function(cb){
                                    database.User.findOne({_id : scheduledRequest.userId}).exec(function(err, userResult){
                                        if(err){
                                            cb(err);
                                        }else{
                                            sr.userName = userResult.name;
                                            sr.userEmail = userResult.email;
                                            sr.userPhoneNumber = userResult.phoneNumber;
                                            sr.userPictureUri = userResult.profilePicture;
                                            cb();
                                        }
                                    });
                                },function(cb){
                                    database.WatermarkPhotos.find({scheduledRequestId : scheduledRequest._id},{path : 1, isChoosed : true}).exec(function(err, watermarkPhotos){
                                        if(err){
                                            cb(err);
                                        } else{
                                            sr.watermarkPhotos = watermarkPhotos;
                                            cb();
                                        }
                                    });
                                },
                                    function(cb){
                                        database.EditedPhotos.find({scheduledRequestId : scheduledRequest._id},{path : 1}).exec(function(err, editedPhotos){
                                            if(err){
                                                cb(err);
                                            } else{
                                                sr.editedPhotos = editedPhotos;
                                                cb();
                                            }
                                        });
                                    },
                                    function(cb){
                                        database.Category.findOne({ _id : scheduledRequest.categoryId}).exec(function(err,categoryResult){
                                            if(err){
                                                cb(err);
                                            }else{
                                                sr.categoryName = categoryResult.name;
                                                cb();
                                            }
                                        });
                                    }], function(err){
                                    if(err){
                                        eachCb(err);
                                    }else{
                                        scheduledRequests.push(sr);
                                        eachCb();
                                    }
                                });
                            }, function(err){
                                if(err){
                                    callback(err);
                                } else{
                                    callback();
                                }
                            });
                        }
                    ], function(err){
                        if(err){
                            next(err);
                        }else{
                            next(null, operationResult.createSuccesResult(scheduledRequests))
                        }
                    })
                }
            });
    }

    photographerOperationsManager.getInstantRequestHistory = function(id, next){
        database.InstantRequest.aggregate(
            {
                $unwind : "$photographerRequests"
            },
            {
                $match : {
                    _id : id
                }
            },
            {
                $sort:
                {
                    "updated" : -1,
                    "requestDate": -1
                }
            },
            {
                $project :
                {
                    _id : 1,
                    finished : 1,
                    cancelled : 1,
                    requestDate : 1,
                    location : 1,
                    arrivedDate : 1,
                    shootingStartedDate : 1,
                    finishedDate : 1,
                    userId : 1,
                    categoryId : 1,
                    photographStyle : 1,
                    nonEditedPhotosAdded : 1,
                    nonEditedPhotosAddedDate :1,
                    userChoosed : 1,
                    userChoosedDate: 1,
                    editedPhotosAdded : 1,
                    editedPhotosAddedDate : 1
                }
            }
        ).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    if(result.length == 0){
                        next(null, operationResult.createSuccesResult());
                        return;
                    }
                    var instantRequest = result[0];
                    async.series([
                        function(cb){
                            database.User.findOne({photographerId : instantRequest.photographerId}).populate("socialUser").exec(function(err, userResult){
                                if(err){
                                    cb(err);
                                }else{
                                    instantRequest.userName = userResult.name;
                                    instantRequest.userEmail = userResult.email;
                                    instantRequest.userPhoneNumber = userResult.phoneNumber;
                                    instantRequest.userPictureUri = userResult.profilePicture;

                                    cb();
                                }
                            })
                        },
                        function(cb){
                            database.WatermarkPhotos.find({instantRequestId : instantRequest._id},{path : 1, isChoosed : true}).exec(function(err, watermarkPhotos){
                                if(err){
                                    cb(err);
                                } else{
                                    instantRequest.watermarkPhotos = watermarkPhotos;
                                    cb();
                                }
                            });
                        },
                        function(cb){
                            database.EditedPhotos.find({instantRequestId : instantRequest._id},{path : 1}).exec(function(err, editedPhotos){
                                if(err){
                                    cb(err);
                                } else{
                                    instantRequest.editedPhotos = editedPhotos;
                                    cb();
                                }
                            });
                        },
                        function(cb){
                            database.Category.findOne({ _id : instantRequest.categoryId}).exec(function(err,categoryResult){
                                if(err){
                                    cb(err);
                                }else{
                                    instantRequest.categoryName = categoryResult.name + (instantRequest.photographStyle == 1 ? " - Indoor" : " - Outdoor");
                                    cb();
                                }
                            });
                        }
                    ], function(err){
                        if(err){
                            next(err);
                        }else{
                            next(null, operationResult.createSuccesResult(instantRequest));
                        }
                    });

                }

            });
    }

    photographerOperationsManager.getPhotographerInstantRequestsHistory = function(photographerId, skipCount, limitCount, include, exclude, next){
        var matchQuery;
        if (exclude) {
            matchQuery = {
                "photographerRequests.photographerId": photographerId,
                "photographerRequests.isTaken": true,
                "_id" : {
                    $nin : [exclude]
                }
            }
        }else{
            matchQuery = {
                "photographerRequests.photographerId": photographerId,
                "photographerRequests.isTaken": true
            }
        }
        database.InstantRequest.aggregate(
            {
                $unwind : "$photographerRequests"
            },
            {
                $match : matchQuery
            },
            {
                $sort:
                {
                    "updated" : -1,
                    "requestDate": -1
                }
            },
            {
                $skip : skipCount
            },
            {
                $limit : limitCount
            },
            {
                $project :
                {
                    _id : 1,
                    finished : 1,
                    cancelled : 1,
                    requestDate : 1,
                    location : 1,
                    arrivedDate : 1,
                    shootingStartedDate : 1,
                    finishedDate : 1,
                    userId : 1,
                    categoryId : 1,
                    photographStyle : 1,
                    nonEditedPhotosAdded : 1,
                    nonEditedPhotosAddedDate :1,
                    userChoosed : 1,
                    userChoosedDate: 1,
                    editedPhotosAdded : 1,
                    editedPhotosAddedDate : 1
                }
            }
        ).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    var instantRequests = [];
                    async.series([
                            function(initialCb){
                                if (include){
                                    var includingInstantReq = _.find(result, function(ir){
                                        return ir._id.toString() === include.toString();
                                    });
                                    if(!includingInstantReq){
                                        database.InstantRequest.aggregate(
                                            {
                                                $unwind : "$photographerRequests"
                                            },
                                            {
                                                $match : {
                                                    "_id" : include
                                                }
                                            },
                                            {
                                                $project :
                                                {
                                                    _id : 1,
                                                    finished : 1,
                                                    cancelled : 1,
                                                    requestDate : 1,
                                                    location : 1,
                                                    arrivedDate : 1,
                                                    shootingStartedDate : 1,
                                                    finishedDate : 1,
                                                    userId : 1,
                                                    categoryId : 1,
                                                    photographStyle : 1,
                                                    nonEditedPhotosAdded : 1,
                                                    nonEditedPhotosAddedDate :1,
                                                    userChoosed : 1,
                                                    userChoosedDate: 1,
                                                    editedPhotosAdded : 1,
                                                    editedPhotosAddedDate : 1
                                                }
                                            }
                                        ).exec(function(err,includeResult){
                                                if(err){
                                                    initialCb(err);
                                                }else{
                                                    if(includeResult.length >0){
                                                        var includingInstantReq = includeResult[0];
                                                        result.splice(0, 0, includingInstantReq);
                                                    }
                                                    initialCb();
                                                }
                                            });
                                    }else{
                                        initialCb();
                                    }
                                }else{
                                    initialCb();
                                }
                            }, function(initialCb){
                                async.each(result, function(instantRequest, eachCb){
                                    async.series([
                                        function(cb){
                                            database.User.findOne({_id : instantRequest.userId}).populate("socialUser").exec(function(err, userResult){
                                                if(err){
                                                    cb(err);
                                                }else{
                                                    instantRequest.userName = userResult.name;
                                                    instantRequest.userEmail = userResult.email;
                                                    instantRequest.userPhoneNumber = userResult.phoneNumber;
                                                    instantRequest.userPictureUri = userResult.profilePicture;

                                                    cb();
                                                }
                                            })
                                        },
                                        function(cb){
                                            database.WatermarkPhotos.find({instantRequestId : instantRequest._id},{path : 1, isChoosed : true}).exec(function(err, watermarkPhotos){
                                                if(err){
                                                    cb(err);
                                                } else{
                                                    instantRequest.watermarkPhotos = watermarkPhotos;
                                                    cb();
                                                }
                                            });
                                        },
                                        function(cb){
                                            database.EditedPhotos.find({instantRequestId : instantRequest._id},{path : 1}).exec(function(err, editedPhotos){
                                                if(err){
                                                    cb(err);
                                                } else{
                                                    instantRequest.editedPhotos = editedPhotos;
                                                    cb();
                                                }
                                            });
                                        },
                                        function(cb){
                                            database.Category.findOne({ _id : instantRequest.categoryId}).exec(function(err,categoryResult){
                                                if(err){
                                                    cb(err);
                                                }else{
                                                    instantRequest.categoryName = categoryResult.name + (instantRequest.photographStyle == 1 ? " - Indoor" : " - Outdoor");
                                                    cb();
                                                }
                                            });
                                        }
                                    ], function(err){
                                        if(err){
                                            eachCb(err);
                                        }else{
                                            instantRequests.push(instantRequest);
                                            eachCb();
                                        }
                                    });
                                }, function(err){
                                    if(err){
                                        initialCb(err);
                                    }else{
                                        initialCb();
                                    }
                                });
                            }
                        ],
                        function(err){
                            if(err){
                                next(err);
                            }else{
                                next(null, operationResult.createSuccesResult(instantRequests));
                            }
                    });

                }
            });
    }

    photographerOperationsManager.getPhotographerUnavailability = function(photographerId, next){
        database.PhotographerUnavailability.find({photographerId : photographerId}).exec(function(err,result){
            console.log('result====>',result,'err====>',err);
           if(err){
               next(err);
           }else{
               next(null, operationResult.createSuccesResult(result));
           }
        });
    }

    photographerOperationsManager.setPhotographerUnavailability = function(photographerId, hoursFromGMT, dates, next){
        database.PhotographerUnavailability.remove({photographerId : photographerId}).exec(function(err, removeResult){
            console.log('in manager===========>',removeResult,'err=========>',err);
            if(err){
                next(err);
            } else{
                async.each(dates, function(d, eachCb) {
                    var photographerUnavailability = new database.PhotographerUnavailability({
                        photographerId : photographerId,
                        day : d.day,
                        hours : d.hours,
                        hoursFromGMT : hoursFromGMT,
                        expireAt : new Date(d.day.getTime() + 60*1000)
                    });

                    photographerUnavailability.save(function(err,saveResult){
                        console.log('in manager after save===========>',saveResult,'err=========>',err);
                        if(err){
                            eachCb(err);
                        } else{
                            eachCb();
                        }
                    });

                },function(err){
                    console.log('err==========>',err);
                    if(err){
                        next(err);
                    }else{
                        next(null,operationResult.createSuccesResult());
                    }
                });
            }
        });
    }

    photographerOperationsManager.updateCamera = function(photographerId, cameraModel, fileName, next){
        database.Photographer.findOneAndUpdate({
            _id : photographerId
        },{
            $set : {
                camera : {
                    model : cameraModel,
                    photoPath : fileName
                }
            },
            $inc : {
                __v : 1
            }
        },{
            new : true
        }).exec(function(err,photographer){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult(photographer.camera));
            }
        })
    }

    photographerOperationsManager.updatePortfolio = function(photographerId, pricingList, exceptList, orderList, files, next){
        database.Portfolio.find({
            photographerId : photographerId,
            _id : {
                $nin : exceptList
            }
        }).exec(function(err, result){
            if(err){
                next(err);
            }else{
                _.each(result, function(r){
                    try {
                        fs.unlinkSync("./public/" + result.path);
                    }
                    catch(err){ }
                    finally{ }
                });
                async.series([function(cb){
                    if(orderList.length == 0){
                        cb();
                    }else {
                        async.each(orderList, function (p, eachCb) {
                            database.Portfolio.update({_id: p.id}, {$set: {order: p.order}}).exec(function (err, result) {
                                if (err) {
                                    eachCb(err);
                                } else {
                                    eachCb()
                                }
                            });
                        }, function(err){
                            if(err){
                                cb(err);
                            }else{
                                cb();
                            }
                        });
                    }
                }], function(err){
                    if(err){
                        next(err);
                    }else{
                        database.Portfolio.remove({photographerId : photographerId, _id : { $nin : exceptList }}).exec(function(err,result){
                            if(err){
                                next(err);
                            }else{
                                if (files == undefined || files == null){
                                    database.Portfolio.find({photographerId : photographerId}).exec(function(err, portfolioResult){
                                        if(err){
                                            next(err);
                                        } else{
                                            database.Photographer.update({_id : photographerId}, {$set : {pricing : pricingList}}).exec(function(err,updateResult){
                                                if(err){
                                                    next(err);
                                                }else{
                                                    if (updateResult.nModified > 0){
                                                        next(null, operationResult.createSuccesResult({ portfolio : portfolioResult}));
                                                    }else{
                                                        next(operationResult.createErrorResult());
                                                    }
                                                }
                                            })

                                        }
                                    });
                                }else{
                                    async.each(files, function(file, cb){
                                        var index = Number(file.originalname.split("-")[1]);
                                        var categoryId = mongoose.Types.ObjectId(file.originalname.split("-")[0]);
                                        var path = "portfolio/" + file.filename;
                                        var portfolioItem = new database.Portfolio({
                                            photographerId : photographerId,
                                            categoryId : categoryId,
                                            path : path,
                                            created : new Date(),
                                            order : index
                                        });

                                        portfolioItem.save(function(err,saveResult){
                                            if(err){
                                                cb(err);
                                            }else{
                                                cb();
                                            }
                                        });
                                    }, function(err){
                                        if(err){
                                            next(err);
                                        }else{
                                            database.Photographer.findOneAndUpdate({_id : photographerId}, { $inc : {__v : 1}, $set : {pricing : pricingList} },{new : true}).exec(function(err,updateResult){
                                                if(err){
                                                    next(err);
                                                }else{
                                                    database.Portfolio.find({photographerId : photographerId}).exec(function(err, portfolioResult){
                                                        if(err){
                                                            next(err);
                                                        } else{
                                                            next(null, operationResult.createSuccesResult({ version : updateResult.__v, portfolio : portfolioResult}));
                                                        }
                                                    });

                                                }
                                            })

                                        }
                                    });
                                }

                            }
                        })

                    }
                });
            }
        })
    }
    photographerOperationsManager.getPhotographersNotAnsweredScheduledRequests = function(exceptList, photographerId, next){
        database.ScheduledRequest.find({
            _id : {
                $nin : exceptList
            },
            photographerId : photographerId,
            isAnswered : false,
            willBeDecidedLater : false
        }).populate("userId").populate("categoryId").exec(function(err,scheduledRequests){
           if(err){
               next(err)
           }else{
                next(null, operationResult.createSuccesResult(scheduledRequests));
           }
        });
    }

    photographerOperationsManager.answerScheduledRequestLater = function(requestId, next){
        database.ScheduledRequest.findOne({ _id : requestId }).exec(function(err, scheduledRequest){
            if(err){
                next(err);
            } else{
                scheduledRequest.willBeDecidedLater = true
                scheduledRequest.save(function(err, saved){
                   if(err){
                       next(err);
                   } else{
                       next(null, operationResult.createSuccesResult());
                   }
                });
            }

        });
    }

    photographerOperationsManager.answerScheduledRequest = function(requestId, response, next){
        database.ScheduledRequest.findOne({ _id : requestId }).exec(function(err, scheduledRequest){
           if(err){
               next(err);
           } else{
               async.waterfall([ function(cb){
                   if (response === true){
                       scheduledRequest.isAnswered = true;
                       scheduledRequest.accepted = true;
                       var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                           return c.scheduleId == requestId.toString() && c.dayLater === true
                       });
                       if (index != -1){
                           global.scheduledRequestCrons[index].cronJob.stop();
                           global.scheduledRequestCrons.splice(index, 1);
                       }
                   }
                   cb(null);
               }, function(cb){
                    if(response === false){
                        scheduledRequest.isAnswered = true;
                        scheduledRequest.accepted = false;
                        scheduledRequest.rejectionDate = new Date();
                        var list = []
                        for (i = 0; i < scheduledRequest.hours; i++){
                            var d = new Date(scheduledRequest.sessionDate.getTime() + i*60*60*1000);
                            var x = new Date(JSON.parse(JSON.stringify(d)));
                            x.setUTCHours(0);
                            var index = _.findIndex(list, function(d){
                                return d.day.toDateString() == x.toDateString()
                            });
                            if (index == -1){
                                list.push({ day : x, hours : [d.getUTCHours()] });
                            }else{
                                list[index].hours.push(d.getUTCHours())
                            }
                        }

                        var jobs = _.filter(global.scheduledRequestCrons, function(src){
                            return src.scheduleId == requestId.toString();
                        });
                        _.each(jobs, function(src){
                            src.cronJob.stop();
                        });

                        for(i = 0; i < jobs.length; i ++ ){
                            var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                return c.scheduleId == requestId.toString()
                            });
                            if (index != -1){
                                global.scheduledRequestCrons[index].cronJob.stop();
                                global.scheduledRequestCrons.splice(index, 1);
                            }
                        }

                        cb(null, list)
                    }else{
                        cb(null, null);
                    }

               }, function(list, cb){
                    if(list){
                        async.each(list, function(d, eachCb){
                            var day = d.day;
                            var hours = d.hours;
                            database.PhotographerUnavailability.findOne({photographerId : scheduledRequest.photographerId, day : day}).exec(function(err,result){
                               if(err || !result){
                                   eachCb(err);
                               }else{
                                   for (i =0; i < hours.length; i++){
                                       var h = hours[i];
                                       var index = result.hours.findIndex(function(hour){
                                           return hour == h;
                                       });
                                       if(index != -1){
                                           result.hours.splice(index,1);
                                       }
                                   }
                                   if(result.hours.length == 0){
                                       result.remove(function(err,removeRes){
                                           if(err){
                                               eachCb(err);
                                           }else{
                                               eachCb();
                                           }
                                       })
                                   }else{
                                       result.save(function(err, updateResult){
                                          if(err){
                                              eachCb(err);
                                          } else{
                                              eachCb();
                                          }
                                       });
                                   }

                               }
                            });
                        }, function(err){
                            if(err){
                                cb(err);
                            }else{
                                cb();
                            }
                        });
                    }else{
                        cb();
                    }
               }], function(err){
                    if(err){
                        next(err);
                    }else{
                        scheduledRequest.save(function(err,saveResult){
                            if(err){
                                next(err);
                            }else{
                                next(null, operationResult.createSuccesResult(), saveResult);
                            }
                        })
                    }
               })

           }

        });
    }

})(module.exports);