const db = require('../utils/db');

module.exports = {
    async find(name, folder_name) {
        const sql = `select * from ${folder_name} where name = '${name}'`;
        console.log(sql);
        const [rows, fields] = await db.load(sql);
        if (rows.length === 0) return null;
        return rows[0];
    },

    async findMode(name, folder_name, mode) {
        var sql;

        if (mode == "file")
            sql = `select * from ${folder_name} where name = '${name}' and data is not null`;
        else
            sql = `select * from ${folder_name} where name = '${name}' and data is null`;

        console.log("findMode: " + sql);

        const [rows, fields] = await db.load(sql);
        if (rows.length === 0) return null;
        return rows[0];
    },

    async findAllFolderInside(folder_name) {
        const sql = `select * from ${folder_name} where data is null`;
        const [rows, fields] = await db.load(sql);
        if (rows.length === 0) return null;
        return rows;
    },

    updateSizeFolderQuery(folder_name, name, update_bytes) {
        return `update ${folder_name} join ${folder_name} old on ${folder_name}.id = old.id set ${folder_name}.bytes = old.bytes + ${update_bytes} where ${folder_name}.name = '${name}'`;
    },

    async all(folder_name) {
        const sql = `select * from ${folder_name}`;
        const [rows, fields] = await db.load(sql);
        return rows;
    },
}
