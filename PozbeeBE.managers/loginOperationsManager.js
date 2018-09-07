(function (loginOperationsManager) {
    var database = require("../PozbeeBE.data/database");
    var phoneActivation = database.PhoneActivation;
    var Device = database.Device;
    var User = database.User;
    var SocialUser = database.SocialUser;
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var randomString = require("randomstring");
    var smsHelper = require("../PozbeeBE.helpers/smsHelper");
    var async = require("async");
    var mongoose = require("mongoose");
    var request = require("request");

    loginOperationsManager.registerPhoneNumber = function (phoneNumber, next) {
        phoneActivation.findOne({phoneNumber: phoneNumber}).exec(function (err, phoneActivationResult) {
            if (err) {
                next(err);
            } else {
                var activationCode = randomString.generate({length: 4, charset: 'numeric'});
                async.waterfall([
                    function (wf) {
                        if (phoneActivationResult && phoneActivationResult.activationCode) {
                            phoneActivationResult.activationCode = activationCode;
                            phoneActivationResult.isActivated = false;
                            phoneActivationResult.save(function (err, phoneActivationUpdateResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    wf(null, false);
                                }
                            });
                        } else {
                            wf(null, true);
                        }
                    }, function (createNew, wf) {
                        if (createNew) {
                            var newPhoneActivation = new database.PhoneActivation({
                                phoneNumber: phoneNumber,
                                activationCode: activationCode
                            });
                            newPhoneActivation.save(function (err, newPhoneActivationResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    if (newPhoneActivationResult) {
                                        wf(null);
                                    } else {
                                        wf(operationResult.createErrorResult("Unknown Error"));
                                    }
                                }
                            })
                        } else {
                            wf(null);
                        }
                    }
                ], function (err) {
                    if (err && err.isSuccess != null && !err.isSuccess) {
                        next(null, err);
                    } else if (err) {
                        next(err);
                    } else {
                        smsHelper.sendSms(phoneNumber, activationCode, function (err, result) {
                            if (err) {
                                next(err);
                            } else {
                                next(null, result);
                            }
                        });
                    }
                })

            }
        });
    }
    loginOperationsManager.getActivationCode = function (phoneNumber, next) {
        phoneActivation.findOne({phoneNumber: phoneNumber}).exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                next(null, operationResult.createSuccesResult(result.activationCode));
            }
        });
    }

    loginOperationsManager.resendActivationCode = function (phoneNumber, next) {
        phoneActivation.findOne({phoneNumber: phoneNumber}).exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                var activationCode = randomString.generate({length: 4, charset: 'numeric'});
                result.activationCode = activationCode;
                reuslt.save(function (err, saveResult) {
                    smsHelper.sendSms(phoneNumber, activationCode, function (err, result) {
                        if (err) {
                            next(err);
                        } else {
                            next(null, result);
                        }
                    });
                })
            }
        });
    }

    loginOperationsManager.activatePhone = function (phoneNumber, activationCode, deviceId, next) {
        async.waterfall([
            function (wf) {
                phoneActivation.findOne({phoneNumber: phoneNumber}).exec(function (err, result) {
                    if (err) {
                        wf(err);
                    } else {
                        if (result) {
                            if (activationCode == result.activationCode) {
                                result.isActivated = true;
                                result.save(function (err, saveResult) {
                                    if (err) {
                                        wf(err);
                                    } else {
                                        wf(null, saveResult);
                                    }
                                });
                            } else {
                                wf(operationResult.createErrorResult("Entered code is mistaken"));
                            }
                        } else {
                            wf(operationResult.createErrorResult("Unknown error occured. Please contact with customer services"));
                        }
                    }
                })
            },
            function (phoneActivationResult, wf) {
                User.findOne({phoneNumber: phoneNumber}).exec(function (err, userResult) {
                    if (err) {
                        wf(err);
                    } else {
                        if (userResult) {
                            userResult.phoneActivation = phoneActivationResult._id;
                            userResult.save(function (err, userSaveResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    wf(null, phoneActivationResult, userSaveResult);
                                }
                            });
                        } else {
                            wf(null, phoneActivationResult, null);
                        }
                    }
                });
            },
            function (phoneActivationResult, user, wf) {
                if (user) {
                    wf(null, user, null);
                } else {
                    SocialUser.findOne({phoneNumber: phoneNumber}).exec(function (err, socialUserResult) {
                        if (err) {
                            wf(err);
                        } else {
                            if (socialUserResult) {
                                socialUserResult.phoneActivation = phoneActivationResult._id;
                                socialUserResult.save(function (err, socialUserSaveresult) {
                                    if (err) {
                                        wf(err);
                                    } else {
                                        wf(null, null, socialUserSaveresult);
                                    }
                                })
                            } else {
                                wf(null, null, null);
                            }

                        }
                    });
                }
            },
            function (user, socialUser, wf) {
                if (deviceId) {
                    Device.findOne({_id: mongoose.Types.ObjectId(deviceId)}).exec(function (err, deviceResult) {
                        if (err) {
                            wf(err);
                        } else {
                            if (deviceResult) {
                                if (user) {
                                    deviceResult.activeUserId = user._id;
                                } else if (socialUser) {
                                    deviceResult.activeSocialUserId = socialUser._id;
                                } else {
                                    deviceResult.activeUserId = null;
                                    deviceResult.activeSocialUserId = null;
                                }

                                deviceResult.save(function (err, deviceSaveResult) {
                                    if (err) {
                                        wf(err);
                                    } else {
                                        wf(null, user, socialUser, deviceSaveResult);
                                    }
                                });
                            } else {
                                var device;
                                if (user) {
                                    device = new Device({
                                        activeUserId: user._id
                                    });
                                } else if (socialUser) {
                                    device = new Device({
                                        activeSocialUserId: socialUser._id
                                    });
                                } else {
                                    device = null;
                                }
                                if (device) {
                                    device.save(function (err, deviceSaveResult) {
                                        if (err) {
                                            wf(err);
                                        } else {
                                            wf(null, user, socialUser, deviceSaveResult);
                                        }
                                    })
                                } else {
                                    wf(null, user, socialUser, device);
                                }
                            }
                        }
                    })
                } else {
                    var device;
                    if (user) {
                        device = new Device({
                            activeUserId: user._id
                        });
                    } else if (socialUser) {
                        device = new Device({
                            activeSocialUserId: socialUser._id
                        });
                    } else {
                        device = null;
                    }
                    if (device) {
                        device.save(function (err, deviceSaveResult) {
                            if (err) {
                                wf(err);
                            } else {
                                wf(null, user, socialUser, deviceSaveResult);
                            }
                        })
                    } else {
                        wf(null, user, socialUser);
                    }
                }
            }
        ], function (err, user, socialUser, device) {
            if (err) {
                next(err)
            } else {
                if (!user && !socialUser) {
                    next(null, operationResult.createSuccesResult({
                        authorize: false,
                        message: "Activation successfull"
                    }));
                } else {
                    next(null, operationResult.createSuccesResult({
                        authorize: true,
                        "deviceId": device._id.toString()
                    }));
                }
            }
        });
    }

    loginOperationsManager.registerUser = function (phoneNumber, nameSurname, email, deviceId, next) {
        phoneActivation.findOne({phoneNumber: phoneNumber}, {_id: 1}).exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                if (!result) {
                    next(operationResult.createErrorResult("Unknown error occured."));
                    return;
                }
                async.waterfall([
                    function (wf) {
                        database.User.findOne({email: email}).exec(function (err, userResult) {
                            if (err) {
                                wf(err);
                            } else {
                                if (userResult) {
                                    if (userResult.email == email && userResult.phoneNumber != phoneNumber) {
                                        wf(operationResult.createErrorResult("This e-mail has been taken by another user."));
                                    } else {
                                        wf(null, userResult);
                                    }
                                } else {
                                    wf(null, null);
                                }
                            }
                        });
                    }, function (userResult, wf) {
                        var user;
                        if (userResult) {
                            user = userResult;
                            userResult.phoneActivation = result._id;
                        } else {
                            user = new database.User({
                                name: nameSurname,
                                email: email,
                                phoneNumber: phoneNumber,
                                phoneActivation: result._id
                            });
                        }
                        user.save(function (err, userSaveResult) {
                            if (err) {
                                wf(err);
                            } else {
                                wf(null, userSaveResult);
                            }
                        });
                    }, function (user, wf) {
                        if (deviceId) {
                            Device.findOne({_id: mongoose.Types.ObjectId(deviceId)}).exec(function (err, deviceResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    if (deviceResult) {
                                        deviceResult.activeUserId = user._id;
                                        deviceResult.save(function (err, deviceSaveResult) {
                                            if (err) {
                                                wf(err);
                                            } else {
                                                wf(null, {"device": deviceSaveResult, "user": user})
                                            }
                                        });
                                    } else {
                                        var device = new database.Device({
                                            activeUserId: user._id
                                        });
                                        device.save(function (err, deviceSaveResult) {
                                            if (err) {
                                                wf(err);
                                            } else {
                                                wf(null, {"device": deviceSaveResult, "user": user});
                                            }
                                        })
                                    }
                                }
                            });
                        } else {
                            var device = new database.Device({
                                activeUserId: user._id
                            });
                            device.save(function (err, deviceSaveResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    wf(null, {"device": deviceSaveResult, "user": user})
                                }
                            });
                        }
                    }
                ], function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        next(null, operationResult.createSuccesResult(result));
                    }
                });
            }
        });
    }

    loginOperationsManager.registerFacebookUser = function (phoneNumber, deviceId, facebookData, next) {
        phoneActivation.findOne({phoneNumber: phoneNumber}).exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                if (!result) {
                    next(operationResult.createErrorResult("Unknown error occured."));
                    return;
                }

                async.waterfall([
                    function (wf) {
                        database.User.findOne({phoneNumber: phoneNumber}).populate("SocialUser").exec(function (err, userResult) {
                            if (err) {
                                wf(err);
                            } else {
                                if (userResult) {
                                    if (userResult.phoneNumber != phoneNumber) {
                                        wf(operationResult.createErrorResult("This e-mail has been taken by another user."));
                                    } else {
                                        wf(null, userResult);
                                    }
                                } else {
                                    var user = new User({
                                        name: facebookData.name,
                                        email: facebookData.email,
                                        phoneNumber: phoneNumber,
                                        phoneActivation: result._id
                                    });
                                    user.save(function (err, userSaveResult) {
                                        if (err) {
                                            wf(err);
                                        } else {
                                            wf(null, userSaveResult);
                                        }
                                    });
                                }
                            }
                        });
                    },
                    function (user, wf) {
                        var socialUser = user.socialUser;
                        if (socialUser) {
                            socialUser.facebookToken = facebookData.token;
                            socialUser.pictureUri = facebookData.pictureUri;
                            socialUser.link = facebookData.link;

                        } else {
                            database.SocialUser.findOne({userId: facebookData.id}).exec(function (err, socialUserResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    if (socialUserResult) {
                                        socialUser = socialUserResult;
                                        socialUser.facebookToken = facebookData.token;
                                        socialUser.pictureUri = facebookData.pictureUri;
                                        socialUser.link = facebookData.link;
                                    } else {
                                        socialUser = new SocialUser({
                                            userId: facebookData.id,
                                            link: facebookData.link,
                                            gender: facebookData.gender,
                                            pictureUri: facebookData.pictureUri,
                                            facebookToken: facebookData.token
                                        });
                                    }
                                    socialUser.save(function (err, socialUserSaveResult) {
                                        if (err) {
                                            user.remove();
                                            wf(err);
                                        } else {
                                            user.socialUser = socialUserSaveResult._id;
                                            var profilePicPath = "public/profilePictures/"+user._id.toString()+".png";
                                            global.download(socialUser.pictureUri, profilePicPath, function(){
                                                user.profilePicture = profilePicPath;
                                                user.save(function (err, userSaveResult) {
                                                    if (err) {
                                                        wf(err);
                                                    } else {
                                                        wf(null, userSaveResult);
                                                    }
                                                });
                                            });
                                        }
                                    })
                                }
                            });

                        }
                    },
                    function (user, wf) {
                        if (deviceId) {
                            Device.findOne({_id: mongoose.Types.ObjectId(deviceId)}).exec(function (err, deviceResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    if (deviceResult) {
                                        deviceResult.activeUserId = user._id;
                                        deviceResult.save(function (err, deviceSaveResult) {
                                            if (err) {
                                                wf(err);
                                            } else {
                                                wf(null, {"device": deviceSaveResult, "user": user})
                                            }
                                        });
                                    } else {
                                        var device = new database.Device({
                                            activeUserId: user._id
                                        });
                                        device.save(function (err, deviceSaveResult) {
                                            if (err) {
                                                wf(err);
                                            } else {
                                                wf(null, {"device": deviceSaveResult, "user": user});
                                            }
                                        })
                                    }
                                }
                            });
                        } else {
                            var device = new database.Device({
                                activeUserId: user._id
                            });
                            device.save(function (err, deviceSaveResult) {
                                if (err) {
                                    wf(err);
                                } else {
                                    wf(null, {"device": deviceSaveResult, "user": user})
                                }
                            });
                        }
                    }
                ], function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        next(null, operationResult.createSuccesResult(result));
                    }
                })
            }
        });
    }

    loginOperationsManager.loginFacebookUser = function (deviceId, facebookData, next) {
        async.waterfall([
            function (wf) {
                database.SocialUser.findOne({userId: facebookData.id}).exec(function (err, socialUserResult) {
                    if (err) {
                        wf(err);
                    } else {
                        wf(null, socialUserResult);
                    }
                });
            },
            function (socialUser, wf) {
                if (socialUser) {
                    socialUser.userId = facebookData.id;
                    socialUser.link = facebookData.link;
                    socialUser.gender = facebookData.gender;
                    socialUser.pictureUri = facebookData.pictureUri;
                    socialUser.facebookToken = facebookData.token;

                    socialUser.save(function(err,res){
                       if(err){
                           wf(err);
                       } else{
                           database.User.findOne({socialUser: socialUser._id}).populate("socialUser").populate("phoneActivation").exec(function (err, userResult) {
                               if (err) {
                                   wf(err);
                               } else {

                                   if (userResult.email != facebookData.email) {
                                       wf(operationResult.createErrorResult("This Facebook account linked with another user"));
                                   } else {
                                       var profilePicPath = "public/profilePictures/"+ userResult._id.toString()+".png";

                                       global.download(socialUser.pictureUri, profilePicPath, function(){
                                           var profilePicEndpoint = "profilePictures/" + userResult._id.toString() + ".png";
                                           userResult.profilePicture = profilePicEndpoint;
                                           userResult.save(function (err, userSaveResult) {
                                               if (err) {
                                                   wf(err);
                                               } else {
                                                   wf(null, userSaveResult);
                                               }
                                           });
                                       });

                                   }
                               }
                           });
                       }
                    });

                } else {
                    database.User.findOne({email: facebookData.email}).populate("phoneActivation").exec(function (err, userResult) {
                        if (err) {
                            wf(err);
                        } else {
                            if (userResult) {
                                var socialUser = new SocialUser({
                                    userId: facebookData.id,
                                    link: facebookData.link,
                                    gender: facebookData.gender,
                                    pictureUri: facebookData.pictureUri,
                                    facebookToken: facebookData.token
                                });
                                socialUser.save(function (err, socialUserSaveResult) {
                                    if (err) {
                                        wf(err);
                                    } else {
                                        userResult.socialUser = socialUserSaveResult._id;
                                        var profilePicPath = "public/profilePictures/"+userResult._id.toString()+".png";
                                        global.download(socialUser.pictureUri, profilePicPath, function(){
                                            var profilePicEndpoint = "profilePictures/" + userResult._id.toString() + ".png";
                                            userResult.profilePicture = profilePicEndpoint;
                                            userResult.save(function (err, userSaveResult) {
                                                if (err) {
                                                    wf(err);
                                                } else {
                                                    wf(null, userSaveResult);
                                                }
                                            });
                                        });
                                    }
                                });
                            } else {
                                wf(null,null);
                            }


                        }
                    })
                }
            },
            function(user,wf){
                if(!user){
                    wf(null,null);
                }else{
                    if (deviceId) {
                        Device.findOne({_id: mongoose.Types.ObjectId(deviceId)}).exec(function (err, deviceResult) {
                            if (err) {
                                wf(err);
                            } else {
                                if (deviceResult) {
                                    deviceResult.activeUserId = user._id;
                                    deviceResult.save(function (err, deviceSaveResult) {
                                        if (err) {
                                            wf(err);
                                        } else {
                                            wf(null, {"deviceId": deviceSaveResult._id, "phoneNumber": user.phoneNumber, "activation" : user.phoneActivation.activationCode});
                                        }
                                    });
                                } else {
                                    var device = new database.Device({
                                        activeUserId: user._id
                                    });
                                    device.save(function (err, deviceSaveResult) {
                                        if (err) {
                                            wf(err);
                                        } else {
                                            wf(null, {"deviceId": deviceSaveResult._id, "phoneNumber": user.phoneNumber, "activation" : user.phoneActivation.activationCode});
                                        }
                                    })
                                }
                            }
                        });
                    } else {
                        var device = new database.Device({
                            activeUserId: user._id
                        });
                        device.save(function (err, deviceSaveResult) {
                            if (err) {
                                wf(err);
                            } else {
                                wf(null, {"deviceId": deviceSaveResult._id, "phoneNumber": user.phoneNumber, "activation" : user.phoneActivation.activationCode});
                            }
                        });
                    }
                }
            }
        ], function (err, result) {
            if(err){
                next(err);
            }else{
                next(null,operationResult.createSuccesResult(result));
            }
        })

    }
})(module.exports);