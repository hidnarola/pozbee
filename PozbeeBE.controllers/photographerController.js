(function(photographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var customerOperationsManager = require("../PozbeeBE.managers/customerOperationsManager");
    var passport = require("passport");
    var moment = require("moment");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads/initialPhotos"});
    var editedUpload = multer({dest : "./uploads/editedPhotos"});
    var cameraUpload = multer({dest : "./public/camera"});
    var portfolioUpload = multer({dest : "./public/portfolio"});
    var mongoose = require("mongoose");
    var iosNotification;


    photographerController.applyIOToManagers = function(io){
        photographerOperationsManager.io = io;
    }

    photographerController.init = function(router){

        router.get("/createPhotographer", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            console.log('reqbody======================>',req.body,userId);
            photographerOperationsManager.createPhotographer(userId, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/setPhotographerActive/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var isActive = req.query.isActive === "1" ? true : false;
            var deviceId = req.query.deviceId;
            var userId = req.user._id;
            photographerOperationsManager.setPhotographerActiveStatus(userId, photographerId, isActive, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   if(photographerController.io){
                       photographerController.io.of("photographer").to(req.user._id.toString()).emit("photographerActiveStatusChanged",isActive,deviceId);
                   }
                   res.status(200).send(result);
               }
            });
        });

        router.get("/setPhotographerOnline/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var isOnline = req.query.isOnline == "1" ? true : false;
            var deviceId = req.query.deviceId;
            photographerOperationsManager.setPhotographerOnlineStatus(photographerId,isOnline, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    console.log('photographerio=========================>',photographerController.io);
                    if(photographerController.io){
                        
                        photographerController.io.of("photographer").to(req.user._id.toString()).emit("photographerOnlineStatusChanged",isOnline,deviceId);
                        photographerController.io.of("customer").to(req.user._id.toString()).emit("joinedSuccessFully",isOnline,deviceId);
                    }
                    res.status(200).send(result);
                }
            });
        });

        router.get("/checkIfPhotographerUpdated/:photographerId/:version", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var version = Number(req.params.version)
            photographerOperationsManager.checkIfPhotographerUpdated(photographerId,version, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });

        router.post("/uploadPhotographerLocation", passport.authenticate("bearer",{session : false}), function(req,res){
            var userId = req.user._id;
            var data = req.body;
            photographerOperationsManager.updateLocationOfPhotographer(userId, data, function(err,result, photographerId){
                if(err){
                    res.status(444).send(err);
                } else{
                    photographerOperationsManager.updatePhotographersActiveInstantRequest(photographerId, req.body, function(err,instantRequestResult){
                        if(!err && instantRequestResult){
                            photographerController.io.of("customer").to(instantRequestResult.userId.toString()).emit("instantRequestPhotographerLocationChanged", data);
                        }
                    });
                    photographerOperationsManager.updatePhotographersActiveScheduledRequest(photographerId, res.body, function(err, scheduledRequestResult){
                        if (!err && scheduledRequestResult){
                            photographerController.io.of("customer").to(scheduledRequestResult.userId.toString()).emit("instantRequestPhotographerLocationChanged", data)
                        }
                    })
                    res.status(200).send(result);
                }
            });
        });

        router.post("/respondToPhotographerRequest",passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.body.photographerId);
            var accepted = req.body.accepted == "1" ? true : (req.body.accepted === "true" ? true : false);
            var instantRequestId = mongoose.Types.ObjectId(req.body.instantRequestId);
            var userId = req.user._id;
            photographerOperationsManager.respondToInstantPhotographerRequest(accepted,photographerId,instantRequestId,function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id === instantRequestId.toString() });
                   if (index != -1){
                       var obj = global.instantRequestTimers[index];
                       clearTimeout(obj.timer);
                       obj.cb();
                   }

                   res.status(200).send(result);
               }
            });
        });

        router.get("/photographerCancelInstantRequest/:instantRequestId", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.params.instantRequestId);
            photographerOperationsManager.cancelInstantRequest(req.user, instantRequestId, function(err, userId, result){
                if(err){
                    res.status(444).send(err);
                }else{
                    photographerController.io.of("customer").to(userId.toString()).emit("instantRequestCancelled", instantRequestId.toString());
                    photographerController.iosNotification.sendNotification(userId,"Photographer cancelled the request.", {type : global.NotificationEnum.RequestCancelled});
                    res.status(200).send(result);
                }
            })
        });

        router.get("/photographerCancelScheduledRequest/:scheduledRequestId", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var scheduledRequestId = mongoose.Types.ObjectId(req.params.scheduledRequestId);
            photographerOperationsManager.cancelScheduledRequest(scheduledRequestId , function(err, result, userId){
                if(err){
                    res.status(444).send(err);
                }else{
                    photographerController.io.of("customer").to(userId.toString()).emit("scheduledRequestCancelled", scheduledRequestId.toString());
                    photographerController.iosNotification.sendNotification(userId,"Photographer cancelled the scheduled request.", {type : global.NotificationEnum.RequestCancelled});
                    res.status(200).send(result);
                }
            })
        });

        router.get("/checkIfPhotographerHasActiveInstantRequest/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.params.photographerId);
            photographerOperationsManager.checkIfPhotographerHasActiveInstantRequest(photographerId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/checkIfPhotographerHasOngoingScheduledRequest/:photographerId", passport.authenticate("bearer", { session : false }), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.params.photographerId);
            photographerOperationsManager.checkIfPhotographerHasOngoingScheduledRequest(photographerId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/informCustomer",passport.authenticate("bearer", {session : false}), function(req,res,next){
            var userId = mongoose.Types.ObjectId(req.query.userId);
            photographerController.iosNotification.sendNotification(userId, "Photographer is coming", {type : global.NotificationEnum.PhotographerIsComing});
        });
        router.get("/confirmArrivalOfPhotographer", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = req.query.instantRequestId != undefined ? mongoose.Types.ObjectId(req.query.instantRequestId) : null;
            var scheduledRequestId = req.query.scheduledRequestId != undefined ? mongoose.Types.ObjectId(req.query.scheduledRequestId) : null;
            photographerOperationsManager.confirmArrivalOfPhotographer(instantRequestId, scheduledRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    var obj = result.resultObject;
                    photographerController.io.of("customer").to(obj.userId.toString()).emit("photographerHasArrived", obj);
                    photographerController.iosNotification.sendNotification(obj.userId,"Photographer has arrived!",{type : global.NotificationEnum.PhotographerArrived});

                    res.status(200).send(result);
                }
            });
        });
        router.get("/startPhotoShooting", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = req.query.instantRequestId != undefined ? mongoose.Types.ObjectId(req.query.instantRequestId) : null;
            var scheduledRequestId = req.query.scheduledRequestId != undefined ? mongoose.Types.ObjectId(req.query.scheduledRequestId) : null;
            photographerOperationsManager.startPhotoShooting(instantRequestId, scheduledRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    var obj = result.resultObject;
                    photographerController.io.of("customer").to(obj.userId.toString()).emit("photoShootingHasBeenStarted", obj);
                    photographerController.iosNotification.sendNotification(obj.userId,"Photo shooting has been started!", {type : global.NotificationEnum.PhotographingSessionStarted});

                    res.status(200).send(result);
                }
            });
        });

        router.get("/finishPhotoShooting", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = req.query.instantRequestId != undefined ? mongoose.Types.ObjectId(req.query.instantRequestId) : null;
            var scheduledRequestId = req.query.scheduledRequestId != undefined ? mongoose.Types.ObjectId(req.query.scheduledRequestId) : null;
            photographerOperationsManager.finishPhotoShooting(instantRequestId, scheduledRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    var obj = result.resultObject;
                    photographerController.io.of("customer").to(obj.userId.toString()).emit("photoShootingHasBeenFinished", obj);
                    photographerController.iosNotification.sendNotification(obj.userId,"Photo shooting has been finished!", {type : global.NotificationEnum.PhotographingSessionFinished});

                    res.status(200).send(result);
                }
            });
        });

        router.get("/getPhotographerScheduledRequestsHistory", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.query.photographerId);
            var skipCount = Number(req.query.skip);
            var limitCount = Number(req.query.limit);
            var include = req.query.include == "" ? null : mongoose.Types.ObjectId(req.query.include);
            var exclude = req.query.exclude == "" ? null : mongoose.Types.ObjectId(req.query.exclude);
            photographerOperationsManager.getScheduledRequestsHistory(photographerId, skipCount, limitCount, include, exclude, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/getPhotographerInstantRequestsHistory", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.query.photographerId);
            var skipCount = Number(req.query.skip);
            var limitCount = Number(req.query.limit);
            var include = req.query.include == "" ? null : mongoose.Types.ObjectId(req.query.include);
            var exclude = req.query.exclude == "" ? null : mongoose.Types.ObjectId(req.query.exclude);
            photographerOperationsManager.getPhotographerInstantRequestsHistory(photographerId, skipCount, limitCount, include, exclude, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/getInstantRequestHistory/:id", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var id = mongoose.Types.ObjectId(req.params.id);
            photographerOperationsManager.getInstantRequestHistory(id, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            });
        });

        var cpUpload = upload.fields([{ name: 'initialPhotos', mimeType : "jpeg"}]);
        router.post("/uploadInitialPhotos", cpUpload, passport.authenticate("bearer",{session : false}) , function(req,res,next){
            var requestId = mongoose.Types.ObjectId(req.body.requestId);
            var isInstant = req.body.isInstant == "1" ? true : false;
            var photos = req.files.initialPhotos;
            console.log('in controller=======>','requestId=====>',requestId,'isInstant====>',isInstant,'phots=======>',photos);
            photographerOperationsManager.uploadInitialPhotosOfRequest(requestId, isInstant, photos, function(err, result, request){
                console.log('err============>',err);
                console.log('result=============>',result);
                console.log('request============>',request);
                if(err){
                    res.status(444).send(err);
                }else{
                    var d = global.getLocalTimeByLocation(request.location.coordinates, request.finishedDate);
                    photographerController.iosNotification.sendNotification(request.userId,'Photos have uploaded for your Instant Photo Shooting which had finished on ' + d.dateStr + '. Select photos you like to be retouched.',{type : global.NotificationEnum.NonEditedPhotosAdded, id : request._id.toString()})
                    res.status(200).send(result);
                }
            });
        });

        var cpUpload = editedUpload.fields([{ name: 'editedPhotos', mimeType : "jpeg"}]);
        router.post("/uploadEditedPhotos", cpUpload, passport.authenticate("bearer",{session : false}) , function(req,res,next){
            var requestId = mongoose.Types.ObjectId(req.body.requestId);
            var isInstant = req.body.isInstant == "1" ? true : false;
            var photos = req.files.editedPhotos;
            console.log('in controller=>','requestId====>',requestId,'isinstant=====>', isInstant,'photos=====>', photos);
            photographerOperationsManager.uploadEditedPhotosOfRequest(requestId, isInstant, photos, function(err, result, request){
                if(err){
                    res.status(444).send(err);
                }else{
                    var d = global.getLocalTimeByLocation(request.location.coordinates, request.finishedDate);
                    photographerController.iosNotification.sendNotification(request.userId,'Retouched Photos have uploaded for your Instant Photo Shooting which had finished on ' + d.dateStr + '.',{type : global.NotificationEnum.EditedPhotosAdded, id : request._id.toString()});
                    res.status(200).send(result);
                }
            });
        })

        router.get("/getPhotographerUnavailability", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = req.query.photographerId;
            photographerOperationsManager.getPhotographerUnavailability(photographerId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.post("/setPhotographerUnavailability", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.body.photographerId);
            var hoursFromGMT = req.body.hoursFromGMT;
            var dates = _.map(req.body.dates, function(d){
                console.log("d ==> ",d);
                var date = new Date(d);
                console.log("Date ==> ",date);
                var hours = d.hours;

                return { "day" : date, "hours" : hours };
            });

            photographerOperationsManager.setPhotographerUnavailability(photographerId, hoursFromGMT, dates, function(err,result){
                // console.log('after called function==========>',result,'err===========>',err);
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        var cpUpload = cameraUpload.fields([{ name: 'cameraPhoto', mimeType : "image/jpeg"}]);
        router.post("/uploadPhotographerCamera", cpUpload, passport.authenticate("bearer",{session : false}) , function(req,res,next){
            var photographerId = req.body.photographerId;
            var filePath = req.files.cameraPhoto[0].filename;
            var model = req.body.model;
            photographerOperationsManager.updateCamera(photographerId, model, filePath, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            });
        });

        var pUpload = portfolioUpload.fields([{name : 'portfolioPhoto', mimeType : 'image/jpeg'}]);
        router.post("/updatePortfolio", pUpload, passport.authenticate("bearer", {session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.body.photographerId);
            var orderList = [];
            var exceptList = [];
            if(req.body.exceptList) {
                var array = req.body.exceptList.split(" ");
                for (i in array) {
                    if (array[i] !== undefined && array[i] !== "" && array[i] !== " ") {
                        if (array[i].split("-").length == 2) {
                            var idStr = array[i].split("-")[0];

                            var id = mongoose.Types.ObjectId(idStr);
                            var order = Number(array[i].split("-")[1]);
                            orderList.push({id: id, order: order});
                        } else {
                            var id = mongoose.Types.ObjectId(array[i]);
                        }
                        exceptList.push(id);
                    }
                }
            }

            var pricingList = _.map(_.filter(req.body.pricingList.split(" "), function(s){
                return s.length > 0
            }), function(s){
                var splittedArray = s.split("-");
                var categoryId = mongoose.Types.ObjectId(splittedArray[0]);
                var price = Number(splittedArray[1]);
                var photoCount = Number(splittedArray[2]);

                return { "categoryId" : categoryId, "price" : price, "leastPhotoCount" : photoCount };
            })


            var filePaths = req.files.portfolioPhoto;
            photographerOperationsManager.updatePortfolio(photographerId, pricingList, exceptList, orderList, filePaths, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            });
        });

        router.get("/getPhotographersNotAnsweredScheduledRequests", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.query.photographerId);
            var exceptList = _.map(req.query.except, function(s){ return mongoose.Types.ObjectId(s); })
            photographerOperationsManager.getPhotographersNotAnsweredScheduledRequests(exceptList, photographerId, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });

        router.post("/answerScheduledRequestLater", passport.authenticate("bearer",{ session : false }), function(req,res, next){
            var requestId = mongoose.Types.ObjectId(req.body.requestId);
            photographerOperationsManager.answerScheduledRequestLater(requestId, function(err, result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        })

        router.post("/answerScheduledRequest", passport.authenticate("bearer", { session : false }), function(req, res, next){
            var scheduledRequestId = mongoose.Types.ObjectId(req.body.requestId);
            var response = req.body.response;
            photographerOperationsManager.answerScheduledRequest(scheduledRequestId, response, function(err, result, scheduledRequest){
                if(err){
                    res.status(444).send(err);
                } else{
                    var d = global.getLocalTimeByLocation(scheduledRequest.location.coordinates, scheduledRequest.sessionDate);
                    photographerController.iosNotification.sendNotification(scheduledRequest.userId,"Your request for " + d.dateStr  + " has been " + (response === true ? "accepted." : "rejected."), {type : (response === true ? global.NotificationEnum.ScheduledRequestAccepted : global.NotificationEnum.ScheduledRequestRejected)});
                    res.status(200).send(result);
                }
            })
        })
        return router;
    }

})(module.exports);