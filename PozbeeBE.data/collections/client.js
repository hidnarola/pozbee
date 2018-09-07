(function(client){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,

        clientSchema = new Schema({
            name: {
                type: String,
                unique: true,
                required: true
            },
            clientId: {
                type: String,
                unique: true,
                required: true
            },
            clientSecret: {
                type: String,
                required: true
            }
        },{collection : "client"});

    client.Model = mongoose.model("Client",clientSchema)
})(module.exports)