import { created } from '.'
import { close } from '../connection'
import { keepBranchesIncluding } from 'treets'

describe('created', () => {
  test('works okay', async () => {
    /**
     * Construct the query.
     * Queries are "generic", you can build and run any query against any
     * collection..
     */
    const query = created
      .since('2018')
      .take(10) // => limit
      .select({ createdAt: 1, _id: 0 }) // => projection

    /**
     * fire the query passing in the collection you want to traverse.
     * Can be any collection that have some `createdAt: Date` property.
     */
    const docs = await query('demo')

    /**
     * db connections are opened automatically. However you have to close it
     * manually when you are done!
     *
     * close database connection..
     */
    close()

    expect(docs).toHaveLength(10)
    expect(docs).toMatchSnapshot()
  })

  test('.to() gives a subset of the previous one', async () => {
    /**
     * fire the query right away passing the `demo` collection at the end...
     */
    const docs = await created
      .since('2018')
      .to('2018-02-09')
      .take(10) // => never take more than this limit
      .select({ createdAt: 1, _id: 0 })('demo')

    close() // close db connection

    expect(docs).toMatchSnapshot()
  })

  test('.explain() works okay and wins over .cursor()', async () => {
    const docs = await created
      .since('2018')
      .to('2018-02-09')
      .take(10) // => should never take more than this limit
      .select({ createdAt: 1, _id: 0 })
      .cursor() // return cursor. however due to explain() should not return a cursor
      .explain()('demo')

    close() // close db connection

    expect(docs).toMatchSnapshot()
  })

  test('.explain() using `keepBranchesIncluding` keeps only what matters.', async () => {
    const docs = await created
      .since('2018')
      .to('2018-02-09')
      .take(10)
      .select({ createdAt: 1, _id: 0 })
      .cursor()
      .explain()('demo')

    close() // close db connection

    expect(
      keepBranchesIncluding(
        ['direction', 'indexName', 'keysExamined', 'totalKeysExamined'],
        docs
      )
    ).toMatchSnapshot()
  })

  test('.explain(with params!) passed to `keepBranchesIncluding`', async () => {
    const keepBranchesHavingOnly = [
      'direction',
      'indexName',
      'keysExamined',
      'totalKeysExamined',
    ]
    const docs = await created
      .since('2018')
      .to('2018-02-09')
      .take(10)
      .select({ createdAt: 1, _id: 0 })
      .explain(keepBranchesHavingOnly)('demo')

    close() // close db connection

    expect(docs).toMatchSnapshot()
  })

  test('.take(10) only, returns 10 docs ordered by createdAt ASC', async () => {
    const docs = await created.take(10).select({ createdAt: 1, _id: 0 })('demo')
    close()
    expect(docs).toHaveLength(10)
    expect(docs).toMatchSnapshot()
  })

  test('accept a string as collection name', async () => {
    const docs = await created.take(1).select({ createdAt: 1, _id: 0 })('demo')

    close()
    expect(docs).toMatchSnapshot()
  })
})
