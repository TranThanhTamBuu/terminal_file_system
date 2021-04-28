module.exports = function (app) {

    app.use('/', require('../controllers/home.route'));
    app.use('/courses/', require('../controllers/courses.route'));

    app.get('/err', function (req, res) {
        throw new Error('Error!');
    });

    app.use(function (req, res) {
        res.render('404', {
            layout: false
        });
    });
}
