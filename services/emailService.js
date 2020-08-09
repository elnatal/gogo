var nodemailer = require('nodemailer');

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
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = { sendEmail };