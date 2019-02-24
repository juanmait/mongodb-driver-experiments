import { conn } from '../connection'

import { Collection, Cursor, Condition } from 'mongodb'
import { keepBranchesIncluding } from 'treets'

export const mongoCollection = async (name: string) => {
  const client = await conn() // => ensure connection
  return client.db().collection(name)
}

type MapCb = (value: any, index: number, array: any[]) => any[]

/**
 * use this one when you're not sure about the shape of an object
 */
interface GenObject {
  [key: string]: any
}

type PromAny = Promise<any>
type PromiseColl = () => Promise<Collection<any>>
type PromArrayAny = Promise<any[]>
type PromCur = Promise<Cursor<any>>
interface Call {
  createdAt: Date
}

type CreatedAtCond = Condition<Call, 'createdAt'>

interface QueryCreatedSince {
  createdAt: CreatedAtCond
}

interface QueryCreatedSinceTo {
  $and: CreatedAtCond
}

interface Projection {
  [key: string]: 0 | 1
}

type CreatedSinceArrayFactory = (coll: PromiseColl | string) => PromArrayAny
type CreatedSinceCursorFactory = (coll: PromiseColl | string) => PromCur
type CreatedSinceExplainFactory = (coll: PromiseColl | string) => PromAny

/**
 * will return this type by default (an array of documents)
 */
type FetchCreatedSinceArr = CreatedSinceArrayFactory & FetchCreatedSinceShape

/**
 * will return this type if `.cursor()` method is called
 */
type FetchCreatedSinceCursor = CreatedSinceCursorFactory &
  FetchCreatedSinceShape

/**
 * will return this type if `.explain()` is called (will win over cursor)
 */
type FetchCreatedExplain = CreatedSinceExplainFactory & FetchCreatedSinceShape

const DEF_LIMIT = 0
const DEF_SINCE = null
const DEF_TO = null
const DEF_PROJECTION: Projection = {}
const DEF_RETURN_CURSOR = false
const DEF_EXPLAIN = false
const DEF_EXPLAIN_KEEP_KEYS: string[] | null = null
const DEF_MAP = null

/**
 * Types definitions for the `create` function, private static properties and
 * public methods.
 */
interface FetchCreatedSinceShape {
  _projection: Projection
  _createdSince: string | null
  _createdTo: string | null
  _limit: number
  _returnCursor: boolean
  _explain: boolean
  _explainKeepKeys: string[] | null
  _mapCallback: MapCb | null

  reset: () => void
  since: (date: string) => FetchCreatedSinceArr
  to: (date: string) => FetchCreatedSinceArr
  upTo: (date: string) => FetchCreatedSinceArr
  take: (limit: number) => FetchCreatedSinceArr
  select: (projection: Projection) => FetchCreatedSinceArr
  cursor: () => FetchCreatedSinceCursor
  explain: (keepKeys?: string[]) => FetchCreatedExplain
  map: (callback: MapCb) => FetchCreatedSinceArr
}

/**
 * Lazily construct a query based on the values of his own static properties
 * and runs it against the passed in Collection resolver.
 *
 * It exposes some static methods that acts as public interface or api to
 * configure the values of the static properties.
 *
 * Once the query is executed and the resulting cursor is obtained, the values
 * of every static property gets reseted to his defaults.
 *
 * @param coll a promise that resolves in a mongodb Collection
 */
export const created = async (coll: PromiseColl | string) => {
  const {
    reset,
    _projection,
    _createdSince,
    _createdTo,
    _limit,
    _returnCursor,
    _explain,
    _explainKeepKeys,
    _mapCallback,
  } = created

  const createdSince = (_createdSince && new Date(_createdSince)) || null
  const to = _createdTo && new Date(_createdTo)

  let query: QueryCreatedSince | QueryCreatedSinceTo | {} = {}

  if (createdSince) {
    query = {
      createdAt: { $gte: createdSince },
    }
  }

  if (to) {
    if (createdSince) {
      query = {
        $and: [
          query,
          {
            createdAt: { $lte: to },
          },
        ],
      }
    } else {
      query = {
        createdAt: { $lte: to },
      }
    }
  }

  let collection

  if (typeof coll === 'string') {
    collection = await mongoCollection(coll)
  } else {
    collection = await coll()
  }
  const mongodbQuery = collection
    .find(query)
    .project(_projection)
    .limit(_limit)
    .sort(['createdAt', 1])

  if (_returnCursor || _explain) {
    const cursor = await mongodbQuery

    if (_explain) {
      // wait for the explain result
      const explanation = (await cursor).explain()
      if (_explainKeepKeys) {
        const explained = await explanation
        /**
         * return filtered explanation
         */
        reset()
        return keepBranchesIncluding(_explainKeepKeys, explained)
      }
      /**
       * return complete explanation
       */
      reset() // re initialize all the props to his defaults
      return explanation
    }

    /**
     * return cursor
     */
    return cursor
  }

  const promArr: Promise<any[]> = mongodbQuery.toArray()

  if (_mapCallback) {
    const docs = await promArr
    reset()
    return docs.map(_mapCallback)
  }

  reset()

  /**
   * return array of documents
   */
  return promArr
}

/**
 * initialize static properties with his defaults
 */
created._limit = DEF_LIMIT
created._projection = DEF_PROJECTION
created._returnCursor = DEF_RETURN_CURSOR
created._createdSince = DEF_SINCE as string | null
created._createdTo = DEF_TO as string | null
created._explain = DEF_EXPLAIN
created._explainKeepKeys = DEF_EXPLAIN_KEEP_KEYS as string[] | null
created._mapCallback = null as MapCb | null

/**
 * reset static properties to his defaults
 */
created.reset = () => {
  created._limit = DEF_LIMIT
  created._projection = DEF_PROJECTION
  created._returnCursor = DEF_RETURN_CURSOR
  created._createdSince = DEF_SINCE
  created._createdTo = DEF_TO
  created._explain = DEF_EXPLAIN
  created._explainKeepKeys = DEF_EXPLAIN_KEEP_KEYS
  created._mapCallback = DEF_MAP
}

created.select = (obj: GenObject): FetchCreatedSinceArr => {
  created._projection = obj || DEF_PROJECTION
  return created as FetchCreatedSinceArr
}

created.take = (limit: number): FetchCreatedSinceArr => {
  created._limit = limit || DEF_LIMIT
  return created as FetchCreatedSinceArr
}

created.since = (date: string): FetchCreatedSinceArr => {
  created._createdSince = date
  return created as FetchCreatedSinceArr
}

created.to = (date: string): FetchCreatedSinceArr => {
  created._createdTo = date
  return created as FetchCreatedSinceArr
}
// alias for `to`
created.upTo = created.to

created.cursor = (): FetchCreatedSinceCursor => {
  created._returnCursor = true
  return created as FetchCreatedSinceCursor
}

created.explain = (keepKeys?: string[]): FetchCreatedExplain => {
  /**
   * dont miss this one ;)
   */
  created._explain = true

  if (keepKeys && Array.isArray(keepKeys) && keepKeys.length) {
    created._explainKeepKeys = keepKeys
  }
  return created as FetchCreatedExplain
}

created.map = (callback: MapCb) => {
  created._mapCallback = callback
  return created
}
