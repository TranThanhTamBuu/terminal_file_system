const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser')
require('express-async-errors');
const cookieParser = require('cookie-parser')
const app = express();


app.use(morgan('dev'));

app.use(express.static('public'));
app.use(cookieParser());

app.use(express.urlencoded({
  extended: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

require('./middlewares/view.mdw')(app);
require('./middlewares/session.mdw')(app);
require('./middlewares/locals.mdw')(app);
require('./middlewares/routes.mdw')(app);


app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.render('500', {
    layout: false
  })
})

app.listen(process.env.PORT || 3000, function () {
 console.log(`FileSystem is listening at http://localhost:3000`)
 })
