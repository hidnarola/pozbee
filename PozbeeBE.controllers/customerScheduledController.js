(function(customerScheduledController) {
    var database = require("../PozbeeBE.data/database");
    var mongoose = require("mongoose");
    var customerOperations = require("../PozbeeBE.managers/customerOperationsManager");
    var scheduledCustomerOperations = require("../PozbeeBE.managers/scheduledCustomerOperations");
    var photographerOperations = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest: "./uploads"});
    var _ = require("underscore");
    var async = require("async");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var iosNotification;


    customerScheduledController.applyIOToManagers = function(io){
        customerOperations.io = io;
    }

    customerScheduledController.init = function(router){

        setRemindersForScheduledRequests();

        router.get("/getPhotographers", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var userId = req.user._id;
            var date = req.query.date;
            var categoryId = mongoose.Types.ObjectId(req.query.categoryId);
            var location = _.map(req.query.location, function(a) { return Number(a) });
            var hours = Number(req.query.hours);
            var lowestPrice = req.query.lowestPrice != null ? Number(req.query.lowestPrice) : 0;
            var highestPrice =  req.query.highestPrice != null ? Number(req.query.highestPrice) : Infinity;
            var leastPhotoCount = req.query.leastPhotoCount != null ? Number(req.query.leastPhotoCount) : 0;
            scheduledCustomerOperations.getPhotographersToSchedule(userId, date, hours, categoryId, location, lowestPrice, highestPrice, leastPhotoCount, function(err, result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });

        router.post("/schedule", passport.authenticate("bearer", { session : false }), function(req,res,next){
            var scheduleDate = new Date(req.body.scheduleDate);
            var categoryId = mongoose.Types.ObjectId(req.body.categoryId);
            var location = _.map(req.body.location, function(a) { return Number(a) });
            var hoursFromGMT = req.body.hoursFromGMT;
            var hours = Number(req.body.hours);
            var photographerId = mongoose.Types.ObjectId(req.body.photographerId);
            var userId = req.user._id
            var dates = _.map(req.body.modifiedDates, function(d){
                var date = new Date(d.day);
                var hours = d.hours;

                return { "day" : date, "hours" : hours };
            });

            scheduledCustomerOperations.scheduleSession(userId, photographerId,scheduleDate,hours, dates,hoursFromGMT, location, categoryId, function(err, result, scheduledRequest){
                if(err){
                    res.status(500).send(err);
                }else{
                    if (result.isSuccess) {

                        photographerOperations.getPhotographerUserId(photographerId, function (err, photographerUserId) {
                            if (err) {

                            } else {
                                var d = global.getLocalTimeByLocation(scheduledRequest.location.coordinates, scheduledRequest.sessionDate);
                                customerScheduledController.iosNotification.sendNotification(photographerUserId, "You have a new scheduled session request on " + d.dateStr + ". Check it out!", {
                                    type: global.NotificationEnum.NewScheduledRequest,
                                    id: scheduledRequest._id.toString()
                                });
                                customerScheduledController.io.of("photographer").to(photographerUserId.toString()).emit("newScheduledRequest", scheduledRequest.toObject());


                                var now = new Date();
                                var dayBeforeJob = new Date(scheduledRequest.sessionDate.getTime() - 24 * 60 * 60 * 1000);
                                var hourBeforeJob = new Date(scheduledRequest.sessionDate.getTime() - 60 * 60 * 1000);
                                var remainingResponseTime = new Date(scheduledRequest.requestDate.getTime() + 24 * 60 * 60 * 1000);
                                var CronJob = require('cron').CronJob;
                                if (now < dayBeforeJob) {
                                    var job = new CronJob(dayBeforeJob, function () {
                                            var d = global.getLocalTimeByLocation(scheduledRequest.location.coordinates, scheduledRequest.sessionDate);
                                            customerScheduledController.iosNotification.sendNotification(photographerUserId, "You have a scheduled session request tomorrow!");
                                            customerScheduledController.iosNotification.sendNotification(userId, "You have a scheduled session request tomorrow!");
                                            this.stop();
                                            var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                                return c.scheduleId == scheduledRequest._id.toString() && c.dayBefore === true;
                                            });
                                            if (index != -1) {
                                                global.scheduledRequestCrons.splice(index, 1);
                                            }
                                        }
                                    );
                                    job.start();
                                    global.scheduledRequestCrons.push({
                                        scheduleId: scheduledRequest._id.toString(),
                                        dayBefore: true,
                                        cronJob: job
                                    });
                                }
                                if (now < hourBeforeJob) {
                                    var job2 = new CronJob(hourBeforeJob, function () {
                                            var d = global.getLocalTimeByLocation(scheduledRequest.location.coordinates, scheduledRequest.sessionDate);
                                            customerScheduledController.iosNotification.sendNotification(photographerUserId, "You have a scheduled session request in an hour!");
                                            customerScheduledController.iosNotification.sendNotification(userId, "You have a scheduled session request in an hour!");
                                            this.stop();
                                            var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                                return c.scheduleId == scheduledRequest._id.toString() && c.hourBefore === true;
                                            });
                                            if (index != -1) {
                                                global.scheduledRequestCrons.splice(index, 1);
                                            }
                                        }
                                    );
                                    job2.start();
                                    global.scheduledRequestCrons.push({
                                        scheduleId: scheduledRequest._id.toString(),
                                        hourBefore: true,
                                        cronJob: job2
                                    });
                                }

                                var job3 = new CronJob(remainingResponseTime, function () {
                                    photographerOperations.answerScheduledRequest(scheduledRequest._id, false, function (err, result) {
                                        if (err) {
                                        }
                                        else {
                                            database.ScheduledRequest.findOne({_id: scheduledRequest._id}).exec(function (err, res) {
                                                if (err || !res) {
                                                } else {
                                                    res.expired = true;
                                                    res.save(function (err, saveResult) {
                                                        if (err || !saveResult) {
                                                        }
                                                        else {
                                                            customerScheduledController.iosNotification.sendNotification(photographerUserId, "A scheduled photoshoot request has expired");
                                                            customerScheduledController.iosNotification.sendNotification(userId, "Your photoshoot request has been rejected");
                                                        }
                                                    })
                                                }
                                            });
                                        }
                                    })

                                    this.stop();
                                    var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                        return c.scheduleId == scheduledRequest._id.toString() && c.dayLater === true;
                                    });
                                    if (index != -1) {
                                        global.scheduledRequestCrons.splice(index, 1);
                                    }
                                });
                                job3.start();
                                global.scheduledRequestCrons.push({
                                    scheduleId: scheduledRequest._id.toString(),
                                    dayLater: true,
                                    cronJob: job3
                                });

                                var job4 = new CronJob(scheduledRequest.sessionDate, function () {
                                    database.ScheduledRequest.findOne({_id: scheduledRequest._id}).exec(function (err, scheduledRequestResult) {
                                        var obj = scheduledRequestResult.toObject();
                                        customerOperations.gatherScheduledRequestInformationForCustomer(scheduledRequest._id, function (err, result) {
                                            if (!err) {
                                                obj.foundPhotographerInformation = result
                                                customerScheduledController.io.of("customer").to(userId).emit("scheduledRequestStarted", obj);
                                                photographerOperations.getPhotographerUserId(scheduledRequest.photographerId, function (err, photographerUserId) {
                                                    if (!err && photographerUserId) {
                                                        customerScheduledController.io.of("photographer").to(photographerUserId.toString()).emit("scheduledRequestStarted", obj);
                                                    }
                                                });
                                                var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                                    return c.scheduleId == scheduledRequest._id.toString() && c.sessionTime === true;
                                                });
                                                if (index != -1) {
                                                    global.scheduledRequestCrons.splice(index, 1);
                                                }
                                            }
                                        })
                                    })


                                });
                                job4.start();

                                global.scheduledRequestCrons.push({
                                    scheduleId: scheduledRequest._id.toString(),
                                    sessionTime: true,
                                    cronJob: job4
                                });
                            }
                        });

                    }
                    res.status(200).send(result);
                }
            })
        });

        return router;
    }

    function setRemindersForScheduledRequests(){
        database.ScheduledRequest.find({ sessionDate : { "$gt" : new Date() }, $or : [ { isAnswered : false }, { isAnswered : true, accepted : true  }] }).exec(function(err, scheduledResults){
            if(err){ }
            else{
                async.each(scheduledResults, function(scheduledRequest, cb){
                    photographerOperations.getPhotographerUserId(scheduledRequest.photographerId, function(err,photographerUserId){
                        if (err) { cb(); }
                        else {
                            var dayBeforeSession = new Date(scheduledRequest.sessionDate.getTime() - 24 * 60 * 60 * 1000);
                            var hourBeforeSession = new Date(scheduledRequest.sessionDate.getTime() - 60 * 60 * 1000);
                            var now = new Date();
                            var remainingResponseTime = new Date(scheduledRequest.requestDate.getTime() + 24 * 60 * 60 * 1000 );
                            var CronJob = require('cron').CronJob;

                            if (dayBeforeSession > now){
                                var job = new CronJob(dayBeforeSession, function () {
                                        var d = global.getLocalTimeByLocation(scheduledRequest.location.coordinates, scheduledRequest.sessionDate);
                                        customerScheduledController.iosNotification.sendNotification(photographerUserId, "You have a scheduled session request tomorrow!");
                                        customerScheduledController.iosNotification.sendNotification(scheduledRequest.userId, "You have a scheduled session request tomorrow!");
                                        this.stop();
                                        var index = _.findIndex(global.scheduledRequestCrons, function(c){
                                            return c.scheduleId == scheduledRequest._id.toString() && c.dayBefore === true;
                                        });
                                        if(index != -1){
                                            global.scheduledRequestCrons.splice(index,1);
                                        }
                                    }
                                );
                                global.scheduledRequestCrons.push({
                                    scheduleId: scheduledRequest._id.toString(),
                                    dayBefore : true,
                                    cronJob: job
                                });

                                job.start();

                            }
                            if (hourBeforeSession > now){
                                var job2 = new CronJob(hourBeforeSession, function () {
                                        var d = global.getLocalTimeByLocation(scheduledRequest.location.coordinates, scheduledRequest.sessionDate);
                                        customerScheduledController.iosNotification.sendNotification(photographerUserId, "You have a scheduled session request in an hour!");
                                        customerScheduledController.iosNotification.sendNotification(scheduledRequest.userId, "You have a scheduled session request in an hour!");
                                        var index = _.findIndex(global.scheduledRequestCrons, function(c){
                                            return c.scheduleId == scheduledRequest._id.toString() && c.hourBefore === true;
                                        });
                                        this.stop();
                                        if(index != -1){
                                            global.scheduledRequestCrons.splice(index,1);
                                        }
                                    }
                                );
                                job2.start();

                                global.scheduledRequestCrons.push({
                                    scheduleId: scheduledRequest._id.toString(),
                                    hourBefore : true,
                                    cronJob: job2
                                });
                            }
                            if (!scheduledRequest.isAnswered) {
                                var job3 = new CronJob(remainingResponseTime, function () {
                                    photographerOperations.answerScheduledRequest(scheduledRequest._id, false, function (err, result) {
                                        if (err) {
                                        }
                                        else {
                                            database.ScheduledRequest.findOne({_id: scheduledRequest._id}).exec(function (err, res) {
                                                if (err || !res) {
                                                } else {
                                                    res.expired = true;
                                                    res.save(function (err, saveResult) {
                                                        if (err || !saveResult) {
                                                        }
                                                        else {
                                                            customerScheduledController.iosNotification.sendNotification(photographerUserId, "A scheduled photoshoot request has expired");
                                                            customerScheduledController.iosNotification.sendNotification(scheduledRequest.userId, "Your photoshoot request has been rejected");
                                                        }
                                                    })
                                                }
                                            });
                                        }
                                    })

                                    this.stop();
                                    var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                        return c.scheduleId == scheduledRequest._id.toString() && c.dayLater === true;
                                    });
                                    if (index != -1) {
                                        global.scheduledRequestCrons.splice(index, 1);
                                    }
                                });
                                job3.start();
                                global.scheduledRequestCrons.push({
                                    scheduleId: scheduledRequest._id.toString(),
                                    dayLater: true,
                                    cronJob: job3
                                });
                            }

                            var job4 = new CronJob(scheduledRequest.sessionDate, function(){
                                database.ScheduledRequest.findOne({_id : scheduledRequest._id}).exec(function(err,scheduledRequestResult){
                                    var obj = scheduledRequestResult.toObject();
                                    customerOperations.gatherScheduledRequestInformationForCustomer(scheduledRequest._id, function(err,result){
                                        if(!err){
                                            obj.foundPhotographerInformation = result
                                            customerScheduledController.io.of("customer").to(scheduledRequest.userId.toString()).emit("scheduledRequestStarted", obj);
                                            photographerOperations.getPhotographerUserId(scheduledRequest.photographerId , function(err, photographerUserId){
                                                if(!err && photographerUserId){
                                                    customerScheduledController.io.of("photographer").to(photographerUserId.toString()).emit("scheduledRequestStarted", obj);
                                                }
                                            });

                                            var index = _.findIndex(global.scheduledRequestCrons, function (c) {
                                                return c.scheduleId == scheduledRequest._id.toString() && c.sessionTime === true;
                                            });
                                            if (index != -1) {
                                                global.scheduledRequestCrons.splice(index, 1);
                                            }
                                        }
                                    })
                                })


                            });
                            job4.start();

                            global.scheduledRequestCrons.push({
                                scheduleId : scheduledRequest._id.toString(),
                                sessionTime : true,
                                cronJob : job4
                            });
                            cb();
                        }
                    })

                }, function(err){

                });
            }
        });
    }


})(module.exports);