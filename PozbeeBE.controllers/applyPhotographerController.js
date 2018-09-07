    (function(applyPhotographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});

    applyPhotographerController.init = function(router){

        router.get('/becomeAPhotographer',passport.authenticate("bearer", {session : false}), function(req,res,next){
            database.Category.find({}).exec(function(err,result){
                var categories = []
                _.each(result, function(category){
                    categories.push(category.toObject());
                })
                res.render('become',{userId : req.user._id.toString(), categories : categories});
            });

        });
        router.get("/applicationResult", function(req,res,next){
            var isSuccess = req.query.isSuccess === "true" ? true : false;
            res.render("applicationResult",{isSuccess : isSuccess});
        });
        router.post('/becomeAPhotographer', function(req,res,next){
            var userId = req.body.userId;
            var data = req.body;
            photographerOperationsManager.createNewApplication(userId, data, function(err,result){
                if(err){
                    res.redirect("/api/apply/applicationResult?isSuccess=false");
                }else{
                    res.redirect("/api/apply/applicationResult?isSuccess=true");
                }
            })
        });

        router.get("/getPhotographerApplication",passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            photographerOperationsManager.getPhotographerApplicationOfUser(userId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });
        var cpUpload = upload.fields([{ name: 'cameraPhoto', maxCount: 5 }, { name: 'backgroundDoc', maxCount: 5 }])
        router.post("/uploadCameraPhoto",cpUpload,passport.authenticate("bearer",{session : false}), function(req,res,next) {
            var photographerApplicationId = req.body.photographerApplicationId;
            var location = [Number(req.body.longitude), Number(req.body.latitude)];
            var cameraPhotos = req.files.cameraPhoto;
            var backgroundDocs = req.files.backgroundDoc;

            photographerOperationsManager.uploadDocumentsPhase(photographerApplicationId,cameraPhotos,location, backgroundDocs,function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            });
        });


        return router;
    }
})(module.exports);