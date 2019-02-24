import { created } from '.'
import { close } from '../connection'

test.only('created.map() should map okay', async () => {
  const docs = await created
    .select({ createdAt: 1, _id: 0 })
    .map(doc => doc.createdAt)
    .upTo('2018-02-09')('demo')

  close()
  expect(docs).toMatchSnapshot()
})
