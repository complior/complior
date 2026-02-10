'use strict';

const pg = require('pg');

const crud = (pool) => (table) => ({
  async query(sql, args) {
    const result = await pool.query(sql, args);
    return result.rows;
  },

  async read(id, fields = ['*']) {
    const names = fields.join(', ');
    const sql = `SELECT ${names} FROM "${table}"`;
    if (!id) return pool.query(sql).then((r) => r.rows);
    const result = await pool.query(
      `${sql} WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create({ ...record }) {
    const keys = Object.keys(record);
    const nums = new Array(keys.length);
    const data = new Array(keys.length);
    let i = 0;
    for (const key of keys) {
      data[i] = record[key];
      nums[i] = `$${++i}`;
    }
    const fields = '"' + keys.join('", "') + '"';
    const params = nums.join(', ');
    const sql =
      `INSERT INTO "${table}" (${fields})` +
      ` VALUES (${params}) RETURNING *`;
    const result = await pool.query(sql, data);
    return result.rows[0];
  },

  async update(id, { ...record }) {
    const keys = Object.keys(record);
    const updates = new Array(keys.length);
    const data = new Array(keys.length);
    let i = 0;
    for (const key of keys) {
      data[i] = record[key];
      updates[i] = `"${key}" = $${++i}`;
    }
    const delta = updates.join(', ');
    const sql =
      `UPDATE "${table}" SET ${delta}` +
      ` WHERE id = $${++i} RETURNING *`;
    data.push(id);
    const result = await pool.query(sql, data);
    return result.rows[0] || null;
  },

  async delete(id) {
    const sql = `DELETE FROM "${table}" WHERE id = $1`;
    return pool.query(sql, [id]);
  },
});

const createDb = (options) => {
  const pool = new pg.Pool(options);

  const db = (table) => crud(pool)(table);
  db.pool = pool;

  db.transaction = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = (table) => crud(client)(table);
      tx.query = (sql, args) =>
        client.query(sql, args).then((r) => r.rows);
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  db.close = () => pool.end();

  return db;
};

module.exports = createDb;
