module.exports = function (app) {
    app.use(async function (req, res, next) {
        var cookie = req.cookies.prompt;

        if (cookie === undefined) {
            res.cookie('prompt', "root:/>")
        }

        next();
    });
}
