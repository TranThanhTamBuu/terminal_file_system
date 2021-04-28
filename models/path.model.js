const db = require('../utils/db');
const folderModel = require('../models/folder.model');
const SHA256 = require("crypto-js/sha256");
const MD5 = require("crypto-js/md5");
const valid = require('../utils/valid');
const moment = require('moment');

var folder_data = [];
var folder_old_path = [];
var folder_new_path = [];

module.exports = {
    async root() {
        const sql = `select * from path where partition_key = 'root'`;
        const [rows, fields] = await db.load(sql);
        return rows[0]
    },

    async insert(path) {
        const [result, fields] = await db.add(path, "path");
        return result;
    },

    async findKey(path) {
        var sql;
        if (path == "root:/" || path == "root:") {
            sql = `select * from path where partition_key = 'root'`;
        } else {
            var key = SHA256(path).toString();
            sql = `select * from path where partition_key = '${key}'`;
        }

        const [rows, fields] = await db.load(sql);
        if (rows.length === 0) return null;
        return rows[0];
    },

    updateSizePathQuery(name, update_bytes) {
        return `update path join path old on path.partition_key = old.partition_key set path.bytes = old.bytes + ${update_bytes} where path.folder_name = '${name}'`;
    },

    async checkExist(path, parent_folder, name, isFolder, p) {
        if (p == "true" && parent_folder == null)
            return null;

        if (isFolder == true) {
            // console.log("check folder");
            return await this.findKey(path);
        }
        else {
            // console.log("check file");
            return await folderModel.findMode(name, parent_folder, "file");
        }
    },

    async parsePath(path) {
        var spl = path.split('/');
        var name = spl[spl.length - 1];

        if (spl.length === 2)
            return ["root", name];
        else {
            var parent = path.substring(0, path.lastIndexOf("/"));
            var row = await this.findKey(parent);

            if (row)
                return [row.folder_name, name];
            else
                return [null, name];
        }
    },

    processInsertQueries(path, parent_folder, name, data) {
        var sql, is_folder = false;
        var size = data.length;
        console.log("data: " + data);

        if (data.length === 0) {
            is_folder = true;
            data = null;
        }

        let date = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        // let date = new Date();
        console.log(date);

        const entityPath = {
            partition_key: SHA256(path).toString(),
            folder_name: name + "_" + valid.hashTimestampMySQL(date),
            bytes: size
        }

        const entity = {
            id: null,
            name: name,
            create_at: date,
            data: data,
            bytes: size
        }

        var queries = [];
        var queryValues = [];

        sql = db.insertQuery(entity, parent_folder);
        queries.push(sql.query);
        queryValues.push(sql.queryValue);


        if (is_folder) {
            sql = db.insertQuery(entityPath, "path");
            queries.push(sql.query);
            queryValues.push(sql.queryValue);

            queries.push(db.createTableQuery(entityPath.folder_name));
            queryValues.push(null);
        }

        return {
            queries: queries,
            queryValues: queryValues,
            folder_name: entityPath.folder_name
        }
    },

    async checkPath(path, p, size) {
        var slash_idx = [];
        var queries = [];
        var queryValues = [];
        var parent_folder = "root";

        for (let i = 0; i < path.length; i++)
            if (path[i] === "/") slash_idx.push(i);

        for (let i = 1; i < slash_idx.length; i++){
            let cur = path.substring(0, slash_idx[i]);
            // console.log("partition_key: " + SHA256(cur).toString());
            let res = await this.findKey(cur);

            let name = valid.getName(cur);
            if (p != "true") {
                queries.push(folderModel.updateSizeFolderQuery(parent_folder, name, size));
                queryValues.push(null);

                queries.push(this.updateSizePathQuery(parent_folder, size));
                queryValues.push(null);
            }


            console.log(cur);
            console.log(res);
            if (res == null)
                if (p == "true") {


                    if (!valid.checkName(name))
                        return false;

                    var process = this.processInsertQueries(cur, parent_folder, name, "");
                    queries = queries.concat(process.queries);
                    queryValues = queryValues.concat(process.queryValues);

                    queries.push(folderModel.updateSizeFolderQuery(parent_folder, name, size));
                    queryValues.push(null);

                    queries.push(this.updateSizePathQuery(parent_folder, size));
                    queryValues.push(null);



                    parent_folder = process.folder_name;
                    console.log("parent_folder update (1) " + parent_folder);
                }
                else return false;
            else {
                parent_folder = res.folder_name;
                console.log("parent_folder update (2) " + parent_folder);
            }

        }

        console.log(queries);
        console.log(queryValues);

        return {
                queries: queries,
                queryValues: queryValues,
                parent_folder: parent_folder
        }
    },

    async updateSize(path, slash_idx, marked_slash_idx, size_to_update) {
        var queries = [];
        var queryValues = [];

        console.log("--------------------------")
        console.log("path: " + path);
        console.log("marked_slash_idx: " + marked_slash_idx);
        console.log("slash_idx: " + slash_idx);
        console.log("size_to_update: " + size_to_update)


        for (let i = 0; i < slash_idx.length; i++) {
            if (marked_slash_idx >= slash_idx[i])
                continue;

            let cur = path.substring(0, slash_idx[i]);
            let [parent_folder, name] = await this.parsePath(cur);

            console.log("cur:" + cur);

            queries.push(folderModel.updateSizeFolderQuery(parent_folder, name, size_to_update));
            queryValues.push(null);

            let cur_path = await this.findKey(cur);

            queries.push(this.updateSizePathQuery(cur_path.folder_name, size_to_update));
            queryValues.push(null);
        }

        console.log(queries);
        console.log(queryValues);

        return {
            queries: queries,
            queryValues: queryValues
        }
    },

    async moveToFolder(from, from_slash_idx, to, to_slash_idx, to_folder, marked_slash_idx, mode) {
        var queries = [];
        var queryValues = [];
        var sql;

        var [from_parent_folder, from_file_name] = await this.parsePath(from);
        var from_file = await folderModel.findMode(from_file_name, from_parent_folder, mode);

        console.log("moveToFolder: from_file: " + from_file);

        const condition = {
            id: from_file.id
        }

        sql = db.deleteQuery(condition, from_parent_folder);
        queries.push(sql.query);
        queryValues.push(sql.queryValue);

        const entity = {
            id: null,
            name: from_file.name,
            create_at: from_file.create_at,
            data: from_file.data,
            bytes: from_file.bytes
        }

        sql = db.insertQuery(entity, to_folder.folder_name);
        queries.push(sql.query);
        queryValues.push(sql.queryValue);

        sql = await this.updateSize(from, from_slash_idx, marked_slash_idx, - from_file.bytes);
        queries = queries.concat(sql.queries);
        queryValues = queryValues.concat(sql.queryValues);

        var to_new_path = to + "/" + from_file_name;
        to_slash_idx.push(to.length);

        sql = await this.updateSize(to_new_path, to_slash_idx, marked_slash_idx, from_file.bytes);
        queries = queries.concat(sql.queries);
        queryValues = queryValues.concat(sql.queryValues);

        // console.log(queries);
        // console.log(queryValues);

        return {
            queries: queries,
            queryValues: queryValues,
            from_file: from_file
        }
    },

    updatePathQueries(old_path, new_path, folder) {
        var queries = [];
        var queryValues = [];

        var sql = db.deleteQuery(
            { partition_key: SHA256(old_path).toString() }, "path"
        );
        queries.push(sql.query);
        queryValues.push(sql.queryValue);

        sql = db.insertQuery(
            {
                partition_key: SHA256(new_path).toString(),
                folder_name: folder.name + "_" + valid.hashTimestampMySQL(folder.create_at),
                bytes: folder.bytes
            },
            "path"
        )
        queries.push(sql.query);
        queryValues.push(sql.queryValue);

        return {
            queries: queries,
            queryValues: queryValues,
        }
    },

    async findAllSubfolder(old_parent_path, new_path, folder) {
        var subfolder = await folderModel.findAllFolderInside(folder.name + "_" + valid.hashTimestampMySQL(folder.create_at));

        if (subfolder == null) return;

        for (let i = 0; i < subfolder.length; i++){
            folder_data.push(subfolder[i]);
            folder_old_path.push(old_parent_path + "/" + subfolder[i].name);
            folder_new_path.push(new_path + "/" + subfolder[i].name);

            await this.findAllSubfolder(old_parent_path + "/" + subfolder[i].name, new_path + "/" + subfolder[i].name, subfolder[i]);
        }

        console.log("folder_data: " + folder_data);
        console.log("folder_old_path: " + folder_old_path);
        console.log("folder_new_path: " + folder_new_path);
    },

    async moveFolderToFolder(from, from_slash_idx, to, to_slash_idx, to_folder, marked_slash_idx) {
        var queries = [];
        var queryValues = [];

        var sql = await this.moveToFolder(from, from_slash_idx, to, to_slash_idx, to_folder, marked_slash_idx, "folder");
        queries = queries.concat(sql.queries);
        queryValues = queryValues.concat(sql.queryValues);

        var from_folder = sql.from_file; // row data of move folder

        console.log("from_folder: " + from_folder);

        sql = this.updatePathQueries(from, to + "/" + from_folder.name, from_folder);
        queries = queries.concat(sql.queries);
        queryValues = queryValues.concat(sql.queryValues);

        await this.findAllSubfolder(from, to + "/" + from_folder.name, from_folder);

        console.log("folder_data: " + folder_data);
        console.log("folder_old_path: " + folder_old_path);
        console.log("folder_new_path: " + folder_new_path);

        for (let i = 0; i < folder_data.length; i++) {
            sql = this.updatePathQueries(folder_old_path[i], folder_new_path[i], folder_data[i]);
            queries = queries.concat(sql.queries);
            queryValues = queryValues.concat(sql.queryValues);
        }

        console.log(queries);
        console.log(queryValues);

        folder_data = [];
        folder_old_path = [];
        folder_new_path = [];

        return {
            queries: queries,
            queryValues: queryValues
        }
    },
}
