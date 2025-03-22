import { ObjectId } from 'mongodb'
import { logger } from '../../services/logger.service.js'
import { taskService } from './task.service.js'
import { socketService } from '../../services/socket.service.js'

let isWorkerOn = false

export async function getTasks(req, res) {
    try {
        const filterBy = { txt: req.query.txt || '' }
        const tasks = await taskService.query(filterBy)
        res.json(tasks)
    } catch (err) {
        logger.error('Failed to get tasks', err)
        res.status(400).send({ err: 'Failed to get tasks' })
    }
}

export async function getTaskById(req, res) {
    try {
        const taskId = req.params.id
        const task = await taskService.getById(taskId)
        res.json(task)
    } catch (err) {
        logger.error('Failed to get task', err)
        res.status(400).send({ err: 'Failed to get task' })
    }
}

export async function addTask(req, res) {
    const { loggedinUser, body: task } = req

    try {
        const addedTask = await taskService.add(task)
        socketService.broadcast({ type: 'task-updated', data: addedTask, userId: loggedinUser._id })
        res.json(addedTask)
    } catch (err) {
        logger.error('Failed to add task', err)
        res.status(400).send({ err: 'Failed to add task' })
    }
}

export async function updateTask(req, res) {
    const { body: task } = req
    // const { loggedinUser, body: task } = req
    // const { _id: userId, isAdmin } = loggedinUser

    // if (!isAdmin && task.owner._id !== userId) {
    //     res.status(403).send('Not your task...')
    //     return
    // }

    try {
        const updatedTask = await taskService.update(task)
        res.json(updatedTask)
    } catch (err) {
        logger.error('Failed to update task', err)
        res.status(400).send({ err: 'Failed to update task' })
    }
}

export async function performTask(req, res) {
    const { loggedinUser } = req
    console.log(loggedinUser)
    const taskId = req.params.id

    try {
        const performedTask = await taskService.performTask(taskId)
        socketService.broadcast({ type: 'task-updated', data: performedTask, userId: loggedinUser._id })
        res.json(performedTask)
    } catch (err) {
        logger.error('Failed to perform task', err)
        res.status(400).send({ err: 'Failed to perform task' })
    }
}

export async function toggleWorker(req, res) {
    try {
        console.log('isWorkerOn', isWorkerOn)
        isWorkerOn = req.body.isWorkerRunning
        if (isWorkerOn) {
            runWorker()
        }
        res.send({ msg: `Toggled worker`, isWorkerOn })
    } catch (err) {
        logger.error('Failed to toggle worker', err)
        res.status(400).send({ err: 'Failed to toggle worker' })
    }
}

export async function runWorker() {
    if (!isWorkerOn) {
        console.log('Worker is not running')
        return
    }

    var delay = 5000
    try {
        const task = await taskService.getNextTask()
        if (!task || task.triesCount > 5) {
            console.log('Worker has encounterd an error')
            isWorkerOn = false
            return null
        }
        if (task) {
            try {
                await taskService.performTask(task._id)
            } catch (err) {
                console.log(`Failed Task`, err)
            } finally {
                delay = 1
            }
        } else {
            console.log('Snoozing... no tasks to perform')
            isWorkerOn = false
            return null
        }
    } catch (err) {
        console.log(`Failed getting next task to execute`, err)
    } finally {
        setTimeout(runWorker, delay)
    }
}

export async function removeTask(req, res) {
    try {
        const taskId = req.params.id
        const removedId = await taskService.remove(taskId)

        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove task', err)
        res.status(400).send({ err: 'Failed to remove task' })
    }
}

export async function addTaskMsg(req, res) {
    const { loggedinUser } = req

    try {
        const taskId = req.params.id
        const msg = {
            txt: req.body.txt,
            by: loggedinUser,
        }
        const savedMsg = await taskService.addTaskMsg(taskId, msg)
        res.json(savedMsg)
    } catch (err) {
        logger.error('Failed to add task msg', err)
        res.status(400).send({ err: 'Failed to add task msg' })
    }
}

export async function removeTaskMsg(req, res) {
    try {
        const { id: taskId, msgId } = req.params

        const removedId = await taskService.removeTaskMsg(taskId, msgId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove task msg', err)
        res.status(400).send({ err: 'Failed to remove task msg' })
    }
}
