(function(categories){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        categoriesSchema = new Schema({
            name : {
                type : String,
                required:  true
            },
            picture : {
                type : String
            },
            showInInstant : {
                type : Boolean
            },
            isDefault : {
                type : Boolean
            }
        },{collection : "category"});

    categories.Model = mongoose.model("Categories",categoriesSchema)
})(module.exports);