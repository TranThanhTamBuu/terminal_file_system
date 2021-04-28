const express = require('express');
const router = express.Router();
const pathModel = require('../models/path.model')
const db = require('../utils/db');
const valid = require('../utils/valid');
const folderModel = require('../models/folder.model');

router.get('/', async function (req, res, next) {
    res.render('home', {
        hello: "hello world",
    });
});

router.get('/prompt', function (req, res) {
    res.json(req.cookies.prompt);
})

router.get('/cd', async function (req, res) {
    const path = req.query.path;

    console.log("path:" + path);
    var result = await pathModel.findKey(path);
    console.log(result);

    if (result == null) {
        res.json("Invalid path");
        return;
    }

    res.cookie('prompt', path + ">");
    res.json(true);
    console.log("done")
})

router.get("/cr", async function(req, res) {
    const p = req.query.p;
    const path = req.query.path;
    const data = req.query.data;
    var is_folder = false;
    var [parent_folder, name] = await pathModel.parsePath(path);

    console.log("parent_folder: " + parent_folder);
    console.log("name: " + name);

    if (data == "")
        is_folder = true;

    console.log("P : " + p);
    console.log("path: " + path);
    console.log("data: " + data);

    if (parent_folder == null && p == "false") {
        res.json("Parent folder does not exit");
        return;
    }

    var check_path_result = await pathModel.checkPath(path, p, data.length);
    if (check_path_result === false) {
        res.json("Invalid path.");
        return;
    }

    var check_filefolder_result = await pathModel.checkExist(path, parent_folder, name, is_folder, p);
    if (check_filefolder_result != null) {
        res.json("File/folder existed.");
        return;
    }

    if (!valid.checkName(name)) {
        res.json("Invalid file/folder name.");
        return;
    }

    var queries = [];
    var queryValues = [];

    queries = queries.concat(check_path_result.queries);
    queryValues = queryValues.concat(check_path_result.queryValues);

    if (p == "true") {
        if (parent_folder == null) {
            parent_folder = check_path_result.parent_folder;
        }
    }

    var process = pathModel.processInsertQueries(path, parent_folder, name, data);
    queries = queries.concat(process.queries);
    queryValues = queryValues.concat(process.queryValues);

    queries.push(pathModel.updateSizePathQuery(parent_folder, data.length));
    queryValues.push(null);

    // if (p != "true") {
    //     queries.push(folderModel.updateSizeFolderQuery(parent_folder, name, data.length));
    //     queryValues.push(null);
    // }



    if (!await db.transaction(queries, queryValues)){
        res.json("An error occurred. Your statement is denied.");
        return;
    }

    res.json("Success.");

});

router.get("/cat", async function (req, res) {
    const path = req.query.path;
    var [parent_folder, name] = await pathModel.parsePath(path);

    if (parent_folder == null) {
        res.json("Invalid path.");
        return;
    }

    var result =  await folderModel.find(name, parent_folder);;
    if (result == null) {
        res.json("'"+ name +"' does not exist.");
        return;
    }

    if (result.data == null) {
        res.json("'"+ name +"' is a folder.");
        return;
    }

    res.json(result.data);
});

router.get("/ls", async function (req, res) {
    var path = req.query.path;
    var name;
    var folder;

    if (path.length == 0) {
        let prompt = req.cookies.prompt;
        var path = prompt.substring(0, prompt.length - 1);
    }

    console.log(path);

    if (path == "root:/") {
        name = "root";

        folder = await pathModel.root();
    }
    else {
        var spl = path.split('/');
        name = spl[spl.length - 1];

        folder = await pathModel.findKey(path);
        if (folder == null) {
            res.json("Invalid path");
            return;
        }
    }

    console.log(folder);

    var rows = await folderModel.all(folder.folder_name);
    var result = `\t\tFolder: ${name} \tSize: ${folder.bytes} (Bytes)`;

    if (rows.length == 0) {
        res.json(result + `\n\n\t\tempty ...`);
        return;
    }

    result+="\n\n\t\tname\t\t\tcreate_at\t\t\t\t\t\t\t\t\t\t\t\ttype\t\t\tsize (bytes)"
    for (let i = 0; i < rows.length; i++){
        let type = "folder";
        if (rows[i].data != null)
            type = "file"

        result += `\n\t\t${rows[i].name}\t\t\t\t${rows[i].create_at}\t\t${type}\t\t\t${rows[i].bytes}`;
    }

    res.json(result);
});

router.get("/mv", async function (req, res) {
    const from = req.query.from;
    const to = req.query.to;
    var result;

    if (from == "root:/") {
        res.json("Can't not move root.");
    }

    var to_folder = await pathModel.findKey(to);
    console.log("to_folder: " + to_folder);

    if (to_folder == null) {
        res.json("Invalid folder destination.");
    }

    if (to.indexOf(from) == 0) {
        res.json("Can't not move to subfolder of itself.");
    }

    var same = valid.findSamePath(from, to);
    var marked_slash_idx = same.length - 1;

    var from_slash_idx = valid.getSlashIdx(from);
    var to_slash_idx = valid.getSlashIdx(to);

    console.log(from);
    console.log(to);

    var from_folder = await pathModel.findKey(from);
    if (from_folder == null) {
        var [check_parent, check_file] = await pathModel.parsePath(from);

        console.log("check_parent: " + check_parent);
        console.log("check_file: " + check_file);

        if (check_parent != null) {

            var is_file_exist = await folderModel.find(check_file, check_parent);
            if (is_file_exist != null) {
                var sql = await pathModel.moveToFolder(from, from_slash_idx, to, to_slash_idx, to_folder, marked_slash_idx, "file");
                result = await db.transaction(sql.queries, sql.queryValues);
            }
            else {
                res.json("Invalid path");
                return;
            }


        }
    }
    else {
        var sql = await pathModel.moveFolderToFolder(from, from_slash_idx, to, to_slash_idx, to_folder, marked_slash_idx);
        result = await db.transaction(sql.queries, sql.queryValues);
    }

    if (!result)
        res.json("An error occurred. Your statement is denied.");
    else {
        res.cookie('prompt',  "root:/>");
        res.json("Success.");
    }


});

// router.get("/test", async function (req, res) {
//     const [rows, fields] = await db.load(`select * from root where name = 'a'`);
//     var a = rows[0];

//     console.log(a);
//     console.log(a.create_at);
//     console.log(moment(a.create_at).format('YYYY-MM-DD HH:mm:ss'));
//     console.log("a_" + valid.hashTimestampMySQL(a.create_at));
//     res.json("a_" + valid.hashTimestampMySQL(a.create_at));
// });

module.exports = router;
