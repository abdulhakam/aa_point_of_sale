/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("3dz9ii2wo8d5q8g")

  collection.name = "order_bookers"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("3dz9ii2wo8d5q8g")

  collection.name = "bookers"

  return dao.saveCollection(collection)
})
