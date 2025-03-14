
export default {
    dbURL: process.env.MONGO_URL || 'mongodb+srv://levavichen:123@mister-tasker.efjdd.mongodb.net/?retryWrites=true&w=majority&appName=mister-tasker',
    dbName: process.env.DB_NAME || 'task_db'
}

// export default {
//   dbURL: process.env.MONGO_URL || 'mongodb+srv://theUser:thePass@cluster0-klgzh.mongodb.net/test?retryWrites=true&w=majority',
//   dbName : process.env.DB_NAME || 'tester_db'
// }