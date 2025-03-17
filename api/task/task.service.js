import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { externalService } from '../../services/external.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const taskService = {
    remove,
    query,
    getById,
    add,
    update,
    addTaskMsg,
    removeTaskMsg,
    performTask,
    getNextTask,
}

async function query(filterBy = {}) {
    try {

        const collection = await dbService.getCollection('task')
        const tasks = await collection.find({}).toArray()
        return tasks
    } catch (err) {
        logger.error('cannot find tasks', err)
        throw err
    }
}

// async function query(filterBy = { txt: '' }) {
//     console.log(filterBy)
//     try {
//         const criteria = _buildCriteria(filterBy)
//         const sort = _buildSort(filterBy)

//         const collection = await dbService.getCollection('task')
//         var taskCursor = await collection.find(criteria, { sort })

//         if (filterBy.pageIdx !== undefined) {
//             taskCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
//         }

//         const tasks = taskCursor.toArray()
//         return tasks
//     } catch (err) {
//         logger.error('cannot find tasks', err)
//         throw err
//     }
// }

async function getById(taskId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(taskId) }

        const collection = await dbService.getCollection('task')
        const task = await collection.findOne(criteria)

        task.createdAt = task._id.getTimestamp()
        return task
    } catch (err) {
        logger.error(`while finding task ${taskId}`, err)
        throw err
    }
}

async function remove(taskId) {
    // const { loggedinUser } = asyncLocalStorage.getStore()
    // const { _id: ownerId, isAdmin } = loggedinUser

    try {
        const criteria = {
            _id: ObjectId.createFromHexString(taskId),
        }

        // if (!isAdmin) criteria['owner._id'] = ownerId

        const collection = await dbService.getCollection('task')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw ('Not your task')
        return taskId
    } catch (err) {
        logger.error(`cannot remove task ${taskId}`, err)
        throw err
    }
}

async function add(task) {
    try {
        const collection = await dbService.getCollection('task')
        await collection.insertOne(task)

        return task
    } catch (err) {
        logger.error('cannot insert task', err)
        throw err
    }
}

async function update(task) {
    const taskToSave = {
        title: task.title,
        status: task.status,
        description: task.description,
        importance: task.importance,
        lastTriedAt: task.lastTriedAt,
        triesCount: task.triesCount,
    }

    try {
        const criteria = { _id: ObjectId.createFromHexString(task._id) }
        const collection = await dbService.getCollection('task')
        await collection.updateOne(criteria, { $set: taskToSave })

        return task
    } catch (err) {
        logger.error(`cannot update task ${task._id}`, err)
        throw err
    }
}

async function performTask(taskId) {
    const collection = await dbService.getCollection('task')
    const criteria = { _id: new ObjectId(taskId) }
    const task = await collection.findOne(criteria)

    task.status = 'running'
    await collection.updateOne(criteria, { $set: task })

    try {
        await externalService.execute(task)
        task.status = 'done'
        task.doneAt = Date.now()
    } catch (err) {
        task.status = 'failed'
        task.errors.push(err)
    } finally {
        task.lastTried = Date.now()
        task.triesCount += 1
        await collection.updateOne(criteria, { $set: task })
    }
    return task
}

async function getNextTask() {
    try {
        const collection = await dbService.getCollection('task')
        const nextTask = await collection.findOne(
            { status: { $ne: 'done' } }
        )
        console.log('next task', nextTask)
        return nextTask
    } catch (err) {
        logger.error('cannot get next task', err)
        throw err
    }
}

async function addTaskMsg(taskId, msg) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(taskId) }
        msg.id = makeId()

        const collection = await dbService.getCollection('task')
        await collection.updateOne(criteria, { $push: { msgs: msg } })

        return msg
    } catch (err) {
        logger.error(`cannot add task msg ${taskId}`, err)
        throw err
    }
}

async function removeTaskMsg(taskId, msgId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(taskId) }

        const collection = await dbService.getCollection('task')
        await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

        return msgId
    } catch (err) {
        logger.error(`cannot remove task msg ${taskId}`, err)
        throw err
    }
}


function _buildCriteria(filterBy) {
    const criteria = {
        title: { $regex: filterBy.txt, $options: 'i' },
        importance: { $gte: filterBy.importance },
    }

    return criteria
}

function _buildSort(filterBy) {
    if (!filterBy.sortField) return {}
    return { [filterBy.sortField]: filterBy.sortDir }
}