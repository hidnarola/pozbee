(function(scheduledCustomerOperations) {
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");
    var moment = require("moment");
    var cron = require("cron");
    var dateRange = require("daterange");


    scheduledCustomerOperations.getIncomingScheduledRequests = function(userId, next){
        var date = new Date();
        database.ScheduledRequest.find({userId : userId, accepted : true, sessionDate : { $gt : date }}, { sessionDate : 1 }).exec(function(err,result){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult(result));
            }
        })
    };

    scheduledCustomerOperations.scheduleSession = function(userId, photographerId, date, hours, unavailabilityFormattedDates, hoursFromGMT, location, categoryId, next){
        database.Photographer.findOne({_id : photographerId}).exec(function(err,photographer){
            if(err){
                next(err);
            }else{
                var d = new Date(date);
                d.setUTCHours(0,0,0);
                var requestLocalDate = global.getLocalTimeByLocation(location, new Date(date)).date;
                database.PhotographerUnavailability.findOne({
                    photographerId : photographer._id,
                    day : d
                }).exec(function(err,unavailability) {
                    if(err){
                        next(err);
                    }else{
                        if(checkAvailability(photographer, requestLocalDate, hours, unavailability)){
                            next(null, operationResult.createErrorResult("Photographer is not available", null));
                        }else{
                            async.each(unavailabilityFormattedDates, function(unavailabilityFormattedDate, eachCb){
                                database.PhotographerUnavailability.findOne({ photographerId : photographerId, day : unavailabilityFormattedDate.day }).exec(function(err,unavailability){
                                    if(err){
                                        eachCb(err);
                                    }else{
                                        var u;
                                        if (unavailability){
                                            u = unavailability;
                                            unavailability.hours = unavailability.hours.concat(unavailabilityFormattedDate.hours);
                                        }else{
                                            u = new database.PhotographerUnavailability({
                                                photographerId : photographerId,
                                                day : unavailabilityFormattedDate.day,
                                                hours : unavailabilityFormattedDate.hours,
                                                hoursFromGMT : hoursFromGMT,
                                                expireAt : new Date(unavailabilityFormattedDate.day.getTime() + 60*1000)
                                            });
                                        }
                                        u.save(function(err,saveResult){
                                           if(err){
                                               eachCb(err);
                                           } else{
                                               eachCb();
                                           }
                                        });
                                    }
                                })
                            },function(err){
                                if(err){
                                    next(err);
                                }else{
                                    var scheduledRequest = new database.ScheduledRequest({
                                        requestDate : new Date(),
                                        userId : userId,
                                        categoryId : categoryId,
                                        //sessionDate : date,
                                        sessionDate : new Date(new Date().getTime() + 1 * 60 * 1000),
                                        location : {
                                            type : "Point",
                                            coordinates : location
                                        },
                                        photographerId : photographerId,
                                        hours : hours
                                    })
                                    scheduledRequest.save(function(err,scheduledRequestResult){
                                       if(err){
                                           next(err);
                                       } else{
                                           scheduledRequestResult.populate("userId").populate("categoryId").populate("photographerId", function(err){
                                               next(null, operationResult.createSuccesResult(),scheduledRequestResult);
                                           })
                                       }

                                    });
                                }
                            });

                        }
                    }
                })


            }
        })
    };

    scheduledCustomerOperations.getPhotographersToSchedule = function(userId, date, hours, categoryId, location, lowestPrice, highestPrice, leastPhotoCount, next){
        var d = new Date(date);
        d.setUTCHours(0,0,0);
        var requestLocalDate = global.getLocalTimeByLocation(location, new Date(date)).date;
        console.log('in requestLocalDate====>',requestLocalDate);
        async.waterfall ([
            function(cb){ 
                console.log('=======================in waterfall first==========================>');
                var now = Date();
                database.ScheduledRequest.find(
                    {
                        userId : userId,
                        sessionDate : { $gt : now },
                        cancelled : false,
                        $or :
                            [
                                { isAnswered : false },
                                { isAnswered : true, accepted : true }
                            ] 
                    }).exec(function(err, usersScheduledRequests){
                        console.log('in usersSchedulrRequests====>',usersScheduledRequests,'err=============>',err);
                    if(err || usersScheduledRequests.length == 0){
                        cb();
                    }else{
                        var sessionDate = new Date(date);
                        var sessionEndDate = new Date(sessionDate.getTime() + hours * 60 * 60 * 1000);
                        var sessionRange = dateRange.create(sessionDate, sessionEndDate);
                        for (i = 0; i < usersScheduledRequests.length; i++){
                            var scheduledRequest = usersScheduledRequests[i];
                            var startDate = scheduledRequest.sessionDate;
                            var endDate = new Date(scheduledRequest.sessionDate.getTime() + scheduledRequest.hours * 60 * 60 * 1000);
                            var scheduledRequestRange = dateRange.create(startDate, endDate);
                            if (dateRange.overlaps(sessionRange, scheduledRequestRange)){
                                cb(operationResult.createErrorResult("You have a scheduled request on the time you choosed"));
                                break;
                            }
                        }
                        cb();
                    }
                })
            },
            function(cb){
                console.log('in second====>');
                database.Photographer.find({
                    permanentLocation : {
                        $nearSphere : {
                            $geometry : {
                                type : "Point",
                                coordinates : location
                            },
                            $maxDistance: 50 * METERS_PER_MILE
                        }
                    },
                    categories : {
                        $elemMatch : {
                            categoryId : categoryId
                        }
                    },
                    pricing : {
                        "$elemMatch" : {
                            categoryId : categoryId,
                            price : { $lte : highestPrice},
                            price : { $gte : lowestPrice },
                            leastPhotoCount : { $gte : leastPhotoCount }
                        }
                    }
                }).exec(function(err,result){
                    console.log('in manager====>',requestLocalDate);
                    if(err){
                        cb(err);
                    }else{

                        cb(null, result);

                    }
                })
            }, function(list, cb){
                console.log('in manager====>',requestLocalDate);
                var photographerList = JSON.parse(JSON.stringify(list));
                async.each(list, function(photographer, eachCb){
                    database.PhotographerUnavailability.findOne({
                        photographerId : photographer._id,
                        day : d
                    }).exec(function(err,unavailability){
                        console.log('in manager====>',requestLocalDate);
                        if(err){
                            eachCb(err);
                        }else{
                            if(unavailability) {
                                if (checkAvailability(photographer, requestLocalDate, hours, unavailability)) {
                                    var indexOfPhotographer = _.findIndex(photographerList, function (p) {
                                        return p._id.toString() == photographer._id.toString();
                                    });
                                    if (indexOfPhotographer != -1) {
                                        photographerList.splice(indexOfPhotographer, 1);
                                    }
                                }
                                eachCb();
                            }else{
                                eachCb();
                            }
                        }
                    })
                },function(err){
                    console.log('in manager====>',requestLocalDate);
                    if(err){
                        cb(err);
                    }  else{
                        cb(null,photographerList);
                    }
                });
            }, function(photographerList, cb){
                console.log('in manager====>',requestLocalDate);
                var list = [];
                async.each(photographerList, function(photographer, eachCb){
                    console.log('in manager====>',requestLocalDate);
                    async.series([
                        function(scb){
                        database.User.findOne({photographer : photographer._id}).exec(function(err, user){
                           if(err){
                               scb(err);
                           }else{
                               photographer.name = user.name;
                               photographer.profilePicturePath = user.profilePicture;
                               photographer.pricing = _.filter(photographer.pricing, function(p){ return p.categoryId == categoryId });
                               scb();
                           }
                        });
                    }, function(scb){
                        console.log('in manager====>',requestLocalDate);
                        database.Portfolio.find({photographerId : photographer._id, categoryId : categoryId}).exec(function(err,portfolioList){
                            console.log('in manager====>',requestLocalDate);
                            if(err){
                               scb(err);
                           } else{
                               var portfolioObjectList = [];
                               _.each(portfolioList, function(p){
                                  portfolioObjectList.push(p.toObject());
                               });
                               photographer.portfolio = portfolioObjectList;
                               scb();
                           }
                        });
                    }], function(err){
                        console.log('in manager====>',requestLocalDate);
                        if(err){
                            eachCb(err);
                        }else{
                            list.push(photographer);
                            eachCb();
                        }
                    });
                },
                function(err){
                    console.log('in manager====>',requestLocalDate);
                    if(err){
                        cb(err);
                    }else{
                        cb(null, list);
                    }
                });
            }
        ], function(err, photographerList){
            console.log('in manager====>',requestLocalDate);
            if(err){
                next(err);

            }else{
                next(null, operationResult.createSuccesResult(photographerList));
            }
        })

    }

    function checkAvailability(photographer, requestLocalDate, hours, unavailability){
        console.log('in manager====>',requestLocalDate);
        if (!unavailability){
            return false;
        }
        var proceedBreak = false;
        for (i = 0; i < hours; i++){
            var d = requestLocalDate.setTime(requestLocalDate.getTime() + (i*60*60*1000));
            for (j = 0; j < unavailability.hours.length; j++){
                var h = unavailability.hours[j];
                var unavailableDateMin = new Date(unavailability.day.getTime() + 1000*60*60*h);
                var unavailableDateMax = new Date(unavailability.day.getTime() + 1000*60*60*(h+1));
                var localUnavailableDateMin = global.getLocalTimeByLocation(photographer.permanentLocation.coordinates, unavailableDateMin).date;
                var localUnavailableDateMax = global.getLocalTimeByLocation(photographer.permanentLocation.coordinates, unavailableDateMax).date;
                if(localUnavailableDateMin <= d && d <= localUnavailableDateMax){
                    proceedBreak = true
                    break;
                }
            }
            if (proceedBreak){
                break;
            }
        }

        return proceedBreak
    }



})(module.exports);