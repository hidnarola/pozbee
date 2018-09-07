(function(photographer){
    var mongoose = require('mongoose'),
        photographerApplication = require("./photographerApplication"),
        Schema = mongoose.Schema,
        portfolioSchema = new Schema({
            order : Number,
            path : String,
            categoryId : Schema.Types.ObjectId
        }),
        pricingSchema = new Schema({
            categoryId : {
                type : Schema.Types.ObjectId
            },
            price : {
                type : Number
            },
            leastPhotoCount : {
                type : Number
            }
        },{ _id : false }),
        photographerSchema= new Schema({
            created : {
                type : Date,
                required : true
            },
            updated : {
                type : Date
            },
            isActive : {
                type : Boolean,
                required : true
            },
            isOnline : {
                type : Boolean,
                required : true
            },
            photographerApplication : {
                type : Schema.Types.ObjectId,
                ref : "PhotographerApplication"
            },
            pricing:{
                type : [pricingSchema]
            },
            lastLocationUpdateDate: {
                type : Date
            },
            location : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            },
            camera : {
                model : {
                    type : String
                },
                photoPath : {
                    type : String
                }
            },
            permanentLocation : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            },
            categories : [photographerApplication.categorySchema],
            portfolio : {
                type : [portfolioSchema]
            },
            rating : {
                type : Number
            }
        },{collection : "photographer"});

    photographerSchema.pre("validate", function(next){
        if (!this.created) { this.created = new Date(); }
        if (!this.isOnline) { this.isOnline = false; }
        if (!this.isActive) { this.isActive = false; }
        if (this.location.coordinates.length == 0) {
            this.location = {
                type: "Point",
                coordinates: [0, 0]
            };
        }
            next();
    });

    photographerSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    photographer.Model = mongoose.model("Photographer",photographerSchema);
})(module.exports);