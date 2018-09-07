var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/become', function(req,res,next){
  res.render('become');
});
router.get('/successful', function(req,res,next){
  res.render('become');
});
router.post('/register', function(req,res,next){
  res.redirect("/successful?isSuccess=true");
});
module.exports = router;
