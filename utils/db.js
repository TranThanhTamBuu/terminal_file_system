const mysql = require('mysql2/promise');
const mysql_opts = require('../config/default.json').mysql_cloud;

const pool = mysql.createPool(mysql_opts);


//const promisePool = pool.promise();

var connection = null;

module.exports = {
  async connect() {
    if (connection == null)
      connection = await mysql.createConnection(mysql_opts);
  },

  async load(sql) {
    await this.connect();
    return await connection.query(sql);
  },

  async add(entity, table_name) {
    await this.connect();
    const sql = `insert into ${table_name} set ?`;
    return await connection.query(sql, entity);
  },

  createTableQuery(table_name) {
    return `CREATE TABLE ${table_name} (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, create_at TIMESTAMP NOT NULL, data VARCHAR(100000), bytes BIGINT)`;
  },

  patchQuery(new_data, condition, table_name) {
    const sql = `update ${table_name} set ? where ?`;
    return {
      query: sql,
      queryValue: [new_data, condition]
    }
  },

  insertQuery(entity, table_name) {
    const sql = `insert into ${table_name} set ?`;
    return {
      query: sql,
      queryValue: entity,
    }
  },

  deleteQuery(entity, table_name) {
    const sql = `delete from ${table_name} where ?`;
    return {
      query: sql,
      queryValue: entity,
    }
  },

  async transaction(queries, queryValues) {
    console.log("transaction start");

    console.log(queries);
    console.log(queryValues);

    if (queries.length !== queryValues.length || queries.length == 0)
      return false;

    await this.connect();
    try {

      await connection.query("SET autocommit = OFF");
      await connection.beginTransaction();

      const queryPromises = [];
      queries.forEach((query, index) => {
        console.log(index)
        if(queryValues[index])
          queryPromises.push(connection.query(query, queryValues[index]));
        else
          queryPromises.push(connection.query(query));
      })
      const results = await Promise.all(queryPromises);

      // for (let i = 0; i < 1; i++){
      //   await connection.query(queries[i], queryValues[i]);
      // }

      await connection.commit();
      await connection.query("SET autocommit = ON");
      return true;

    } catch (error) {
      await connection.rollback();
      console.log(error);
      return false;

    }
  }
};
