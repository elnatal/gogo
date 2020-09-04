const { transports, createLogger, format} = require('winston');
require('winston-mongodb')

const logger = createLogger({
    transports: [
        new transports.Console({
            level: 'info',
            format: format.combine(format.timestamp(), format.json())
        }),
        new transports.MongoDB({
            level: 'info',
            db: process.env.DB_CONNECTION,
            options: { useUnifiedTopology: true },
            collection: 'logs',
            format: format.combine(format.timestamp(), format.json())
        })
    ],
})

module.exports = logger;