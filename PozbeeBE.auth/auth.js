(function(auth){
    var passport = require('passport');
    var BearerStrategy = require('passport-http-bearer').Strategy;
    var BasicStrategy = require('passport-http').BasicStrategy;
    var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
    var config = require('../config');

    var Client = require("../PozbeeBE.data/collections/client").Model;
    var User = require('../PozbeeBE.data/collections/user').Model;

    var AccessToken = require('../PozbeeBE.data/collections/accessToken').Model;

    passport.use(new BasicStrategy({passReqToCallback: true},
        function(req, username, password, done) {
            console.log('basic stratergy================>');
            Client.findOne({ clientId: username }, function(err, client) {
                if (err) {
                    return done(err);
                }

                if (!client) {
                    return done(null, false);
                }

                if (client.clientSecret !== password) {
                    return done(null, false);
                }

                return done(null, client);
            });
        }
    ));

    passport.use(new ClientPasswordStrategy({passReqToCallback : true},
        function(req, clientId, clientSecret, done) {
            console.log('client password stratergy===============>');
            Client.findOne({ clientId: clientId }, function(err, client) {
                if (err) {
                    return done(err);
                }

                if (!client) {
                    return done(null, false);
                }

                if (client.clientSecret !== clientSecret) {
                    return done(null, false);
                }
                if(req.body.deviceId && req.body.phoneNumber && req.body.activationCode)
                    return done(null, {"client": client, "deviceId" : req.body.deviceId, "phoneNumber" : req.body.phoneNumber, "activationCode" : req.body.activationCode});
                else
                    return done(null, {"client" : client})
            });
        }
    ));

    passport.use(new BearerStrategy({passReqToCallback : true},
        function(req, accessToken, done) {
            console.log('bearer stratergy================>');
            AccessToken.findOne({ token: accessToken }, function(err, token) {
                // console.log('err==>',err,'token=====>',token);
                if (err) {
                    return done(err);
                }

                if (!token) {
                    return done(null, false);
                }

                // && Math.round((Date.now()-token.created)/1000) < 90000000 
                // if(token.userId) {

                //     AccessToken.remove({ token: accessToken }, function (err) {
                //         if (err) {
                //             return done(err);
                //         }
                //     });

                //     return done(null, false, { message: 'Token expired' });
                // }
                if(token.userId) {
                    User.findById(token.userId, function (err, user) {

                        if (err) {
                            return done(err);
                        }

                        if (!user) {
                            return done(null, false, {message: 'Unknown user'});
                        }

                        var info = {scope: '*'};
                        done(null, user, info);
                    });
                }else{
                    SocialUserAcoount.findById(token.socialUserAccountId, function(err, sua){
                        if (err) {
                            return done(err);
                        }

                        if (!sua) {
                            return done(null, false, {message: 'Unknown user'});
                        }

                        var info = {scope: '*'};
                        done(null, sua, info);
                    })
                }
            });
        }
    ));
})(module.exports);