(function(controllers){
    var iosNotification = require("../PozbeeBE.helpers/notification/iosNotification");
    var express = require('express');
    var router = express.Router();
    var clientController = require("./clientController");
    var userController = require("./userController");
    var photographerController = require("./photographerController");
    var applyPhotographerController = require("./applyPhotographerController");
    var customerController = require("./customerController");
    var customerScheduledController = require("./customerScheduledController");
    photographerController.iosNotification = iosNotification;
    customerController.iosNotification = iosNotification;
    customerScheduledController.iosNotification = iosNotification;

    controllers.init = function(app, io){
        app.use("/api/client", clientController.init(router));
        app.use("/api/users", userController.init(router));
        app.use("/api/photographer", photographerController.init(router));
        app.use("/api/apply", applyPhotographerController.init(router));
        app.use("/api/customer",customerController.init(router));
        app.use("/api/customer/scheduled", customerScheduledController.init(router));
    }

    controllers.applyIOToControllers = function(io){
        userController.io = io;
        photographerController.io = io;
        photographerController.applyIOToManagers(io);
        customerController.io = io;
        customerController.applyIOToManagers(io);
        customerScheduledController.applyIOToManagers(io);
        customerScheduledController.io = io;
        photographerController.io = io;
    }
})(module.exports);