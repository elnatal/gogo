var nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'taxitestemail12@gmail.com',
        pass: 'TaxiTest12'
    }
});

const sendEmail = (to, subject, text) => {
    transporter.sendMail({
        from: 'taxitestemail12@gmail.com',
        to,
        subject,
        text
    }, function (error, info) {
        if (error) {
            logger.error("Email => " + error.toString());
        } else {
            logger.info("Email sent: " + info.response);
        }
    });
}

module.exports = { sendEmail };