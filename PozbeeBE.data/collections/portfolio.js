(function (portfolio){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        portfolioSchema = new Schema({
            photographerId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "Photographer"
            },
            order : {
                type :  Number ,
                required : true
            },
            path : {
                type : String,
                required : true
            },
            categoryId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "Categories"
            },
            created: {
                type : Date,
                required : true
            }
        },{collection : "portfolio"});

    portfolioSchema.pre("validate", function(next){
        next();
    });

    portfolio.Model = mongoose.model("Portfolio", portfolioSchema);
})(module.exports)