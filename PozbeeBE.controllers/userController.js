(function(userController){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var loginOperationsManager = require("../PozbeeBE.managers/loginOperationsManager");
    var userOperationsManager = require("../PozbeeBE.managers/userOperationsManager");
    var passport = require("passport");
    var mongoose = require("mongoose");
    var multer = require("multer");
    var upload = multer({dest : "./public/profilePictures"});
    userController.init = function(router){
        router.get("/registerPhone/:phoneNumber", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            console.log('phone number===============>',phoneNumber);
            loginOperationsManager.registerPhoneNumber(phoneNumber, function(err,result){
                if(err){
                    console.log('err============>',err);
                    res.status(444).send(err);
                }else{
                    console.log('result============>',result);
                    res.status(200).send(result);
                }
            })
        });
        router.get("/activatePhone/:phoneNumber/:activationCode", function(req,res,next){
            var phoneNumber= req.params.phoneNumber;
            var activationCode = req.params.activationCode;
            var deviceId = req.query.deviceId;
            console.log(phoneNumber,'         ',activationCode,'             ',deviceId);
            // res.json({"phone":phoneNumber,"activation":activationCode,"deviced":deviceId});
            loginOperationsManager.activatePhone(phoneNumber,activationCode, deviceId, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });
        router.get("/getActivationCode/:phoneNumber", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            loginOperationsManager.getActivationCode(phoneNumber, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });

        router.get("/registerUser/:phoneNumber/:nameSurname/:email", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            var nameSurname = req.params.nameSurname;
            var email = req.params.email;
            var deviceId = req.query.deviceId;
            loginOperationsManager.registerUser(phoneNumber,nameSurname, email, deviceId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });

        router.post("/registerFacebookUser/:phoneNumber", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            var facebookData = req.body;
            var deviceId = req.body.deviceId;

            loginOperationsManager.registerFacebookUser(phoneNumber,deviceId,facebookData,function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });
        router.post("/loginFacebookUser", function(req,res,next){
            var facebookData = req.body;
            var deviceId = req.body.deviceId;
            loginOperationsManager.loginFacebookUser(deviceId,facebookData, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        })

        router.get("/checkIfUserUpdated", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            var version = req.query.version;

            userOperationsManager.checkIfUserUpdated(userId,version, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/test/sadasd",passport.authenticate("bearer", {session : false}), function(req,res,next){
           res.status(200).send({"test": 1213});
        });   

        router.get("/fetchCategories", function(req,res,next){
           userOperationsManager.fetchCategories(function(err,result){
               if(err){
                   res.status(444).send(err);
               }else{
                   res.status(200).send(result);
               }
           });
        });

        router.get("/logout", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var deviceId = req.query.deviceId;
            userOperationsManager.logout(deviceId, function(err,result){
               if(err){
                   res.status(444).send(err);
               }else{
                   res.status(200).send(result);
               }
            });
        });

        router.get("/registerRemoteNotificationToken", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var deviceId = mongoose.Types.ObjectId(req.query.deviceId);
            var remoteNotificationToken = req.query.notificationToken;

            userOperationsManager.registerRemoteNotificationToken(deviceId, remoteNotificationToken, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });
        var cpUpload = upload.fields([{ name: 'profilePicture', mimeType : "image/jpeg"}]);
        router.post("/uploadProfilePicture", cpUpload, passport.authenticate("bearer",{session : false}) , function(req,res,next){
            var userId = req.user._id
            var photo = req.files.profilePicture[0].filename;
            userOperationsManager.uploadProfilePicture(userId, photo, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            } )

        });

        router.post("/updateUserProfile", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            var cityName = req.body.cityName == "" ? null : req.body.cityName;
            var cityPlaceId = req.body.placeId == "" ? null : req.body.placeId;
            var about = req.body.about == "" ? null : req.body.about;
            var funFacts = req.body.funFacts == "" ? null : req.body.funFacts;
            console.log('request object========>',req.body);
            console.log("userid===>",userId,"cityName=========>",cityName,"cityplace==============>",cityPlaceId,"about===========>",about);
            userOperationsManager.updateUserProfile(userId, cityName, cityPlaceId, about, funFacts, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });
        //app.get("/campaign/getUserPopulationRange/:venueId/:meters",
        //    passport.authenticate("bearer", { session : false }),
        //    mustbe.authorized("roles.pusher",
        //        function (req, res) {
        //            var venueId = req.params.venueId;
        //            var meters = (+req.params.meters) * 1000;
        //
        //            campaignManager.getUserPopulationRange(venueId, meters, function (err, result) {
        //                if (err) {
        //                    res.status(444).send(err);
        //                } else {
        //                    res.status(200).send(result);
        //                }
        //            })
        //        })
        //);

        return router;
    }
})(module.exports);