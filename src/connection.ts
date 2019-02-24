import { MongoClient } from 'mongodb'

const url = 'mongodb://localhost:27017/mydb'

let _conn: MongoClient

export const conn = async (): Promise<MongoClient> => {
  if (!_conn || !_conn.isConnected()) {
    _conn = await MongoClient.connect(url, { useNewUrlParser: true })
  }

  return _conn
}

export const getDb = async () => {
  const client = await conn()
  const db = await client.db('mydb')
  return db
}

/**
 * close current connection
 */
export const close = () => {
  if (_conn && _conn.isConnected()) {
    _conn.close()
  }
}
