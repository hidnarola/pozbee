(function(photographerApplication){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        categorySchema = new Schema({
            categoryId : {
                type : Schema.Types.ObjectId,
                ref : "Category"
            },
            styles : [Number]
        },{_id : false}),
        photographerApplicationSchema= new Schema({
            name : {
              type : String,
                required : true
            },
            email:{
                type : String,
                required : true
            },
            created : {
                type : Date,
                required : true
            },
            zipCode : {
                type : Number,
                required : true
            },
            phoneNumber:  {
                type : String,
                required : true
            },
            categories : [categorySchema],
            cameraModel : {
                type : String,
                required : true
            },
            ableToRetouch : {
                type : Boolean
            },
            minHourlyRate : {
                type : Number
            },
            webSite : {
                type : String
            },
            isApproved : {
                type : Boolean,
                required : true
            },
            reviewPhase : {
                type : Number,
                required : true
            },
            cameraPhotos : {
                type : [String]
            },
            backgroundDocs : {
                type : [String]
            },
            permanentLocation : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            }
        },{collection : "photographerApplication"});

    photographerApplicationSchema.pre("validate", function(next){
        if (!this.created) { this.created = new Date(); }
        next();
    });

    photographerApplicationSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });
    photographerApplication.categorySchema = categorySchema;
    photographerApplication.Model = mongoose.model("PhotographerApplication",photographerApplicationSchema);
})(module.exports);