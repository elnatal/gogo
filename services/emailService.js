var nodemailer = require('nodemailer');
const logger = require('./logger');
const Setting = require('../models/Setting');
const moment = require('moment');
require('dotenv/config');

const transporter = nodemailer.createTransport({
    // Test config
    // service: 'gmail',
    // auth: {
    //     user: 'taxitestemail12@gmail.com',
    //     pass: 'TaxiTest12'
    // }
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

const sendEmail = (to, subject, html) => {
    transporter.sendMail({
        html,
        from: 'shuufare@g2gclarity.com',
        to,
        subject
    }, function (error, info) {
        if (error) {
            logger.error("Email => " + error.toString());
        } else {
            logger.info("Email sent: " + info.response);
        }
    });
}

const customerEmail = async ({ trip, setting }) => {
    if (trip && trip.passenger && trip.driver && trip.vehicle && trip.vehicleType) {
        if (setting == null) {
            setting = await Setting.findOne();
        }

        var date = new Date();
        var tsts = new Date(trip.pickupTimestamp);
        var durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60;

        var minute = durationInMinute % 60;
        var hour = (durationInMinute - minute) / 60;

        hour += ":" + Math.round(minute).toString().padStart(2, "0");

        return `<div style="background-color:#f1f1f1;margin:0;padding:0;font-family:sans-serif">
                <table style="background-color:#000c18;width:100%">
                    <tbody>
                        <tr>
                            <td style="padding:0;text-align:center;padding-top:10px;padding-bottom:10px;color:#ffffff">
                                <div style="text-align:center;width:100%;display:inline-block;vertical-align:top;font-size:1.5em">
                                    Thanks for riding with us, ${trip.passenger.firstName + ' ' + trip.passenger.lastName}!
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table style="width:100%">
                    <tbody>
                        <tr>
                            <td style="padding:0;text-align:center;padding-top:10px;padding-bottom:0px">
                                <div
                                    style="text-align:left;width:100%;max-width:500px;display:inline-block;vertical-align:top;font-size:1.5em">
                                    <table style="width:100%;font-family:sans-serif;color:#333333">
                                        <tbody>
                                            <tr>
                                                <td style="text-align:center;vertical-align:middle">
                                                    <img style="width:60%"
                                                        src="https://res.cloudinary.com/ika/image/upload/v1608090504/zmith5rlmbv2cwbep9f4.png"
                                                        alt="logo" class="CToWUd a6T" tabindex="0">
                                                    <div class="a6S" dir="ltr" style="opacity: 0.01; left: 758px; top: 164.25px;">
                                                        <div id=":4r" class="T-I J-J5-Ji aQv T-I-ax7 L3 a5q" title="Download"
                                                            role="button" tabindex="0" aria-label="Download attachment "
                                                            data-tooltip-class="a1V">
                                                            <div class="wkMEBb">
                                                                <div class="aSK J-J5-Ji aYr"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px">
                                                    <table
                                                        style="font-family:sans-serif;color:#333333;width:100%;font-size:14px;text-align:left">
                                                        <tbody>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:2px;float:none;display:block;text-align:left">
                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span
                                                                                    style="width:100%;display:block;text-align:center;font-family:Tahoma,Arial,Helvetica,sans-serif;font-size:24px"><strong></strong>
                                                                                    ${moment(trip.createdAt).format('DD MMM YYYY')}</span>
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <strong>
                                                                                <span
                                                                                    style="width:100%;display:block;text-align:center;font-family:Tahoma,Arial,Helvetica,sans-serif;font-size:24px;color:#FFA500"><strong></strong>
                                                                                    Total<br>ETB
                                                                                    ${trip.fare.toFixed(2)}</span>
                                                                            </strong>
                                                                        </div>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:2px;float:none;display:block;text-align:left">

                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span
                                                                                    style="width:100%;display:block;text-align:center;font-family:Tahoma,Arial,Helvetica,sans-serif;font-size:24px;color:#000c18">
                                                                                    ${hour + ' / ' + trip.totalDistance} km</span>
                                                                            </p>
                                                                        </div>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:2px;float:none;display:block;text-align:left">
                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span style="width:50%;display:block;float:left">
                                                                                    <strong>Pickup</strong><br>
                                                                                    <span style="font-size:10px">${moment(trip.pickupTimestamp).format('HH:mm:ss A')}</span>
                                                                                </span>
                                                                                <span
                                                                                    style="margin:0.3em 0em;width:50%;display:block;float:right;text-align:left">
                                                                                    ${trip.pickUpAddress.name}</span>
                                                                            </p>
                                                                        </div>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:2px;float:none;display:block;text-align:left">
                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span style="width:50%;display:block;float:left">
                                                                                    <strong>Dropoff</strong><br>
                                                                                    <span style="font-size:10px">${moment(trip.endTimestamp).format('HH:mm:ss A')}</span>
                                                                                </span>
                                                                                <span
                                                                                    style="margin:0.3em 0em;width:50%;display:block;float:left;text-align:left">
                                                                                    ${trip.dropOffAddress.name}</span>
                                                                            </p>
                                                                        </div>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:3px;float:none;display:block;text-align:left">
                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span
                                                                                    style="width:50%;display:block;float:left"><strong>Driver</strong></span>
                                                                                <span
                                                                                    style="width:50%;display:block;float:left;text-align:left">${trip.driver.firstName + ' ' + trip.driver.lastName}</span>
                                                                            </p>
                                                                        </div>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:3px;float:none;display:block;text-align:left">
                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span
                                                                                    style="width:50%;display:block;float:left"><strong>Vehicle type</strong></span>
                                                                                <span
                                                                                    style="width:50%;display:block;float:left;text-align:left">${trip.vehicleType.name}</span>
                                                                            </p>
                                                                        </div>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding:0px;background-color:#ffffff;overflow:hidden">
                                                                    <span
                                                                        style="margin-top:3px;float:none;display:block;text-align:left">
                                                                        <div>
                                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                                <span
                                                                                    style="width:50%;display:block;float:left"><strong>Vehicle</strong></span>
                                                                                <span
                                                                                    style="width:50%;display:block;float:left;text-align:left">${trip.vehicle.color + ' ' + trip.vehicle.modelName + ', ' + trip.vehicle.plateNumber}</span>
                                                                            </p>
                                                                        </div>
                                                                    </span>

                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td
                                                    style="background-color:#ffffff;overflow:hidden;text-align:center;vertical-align:middle">
                                                    <span style="margin-top:2px;float:none;display:block;text-align:center">
                                                        <div>
                                                            <p style="padding:0em 0.8em 0.0em 0.8em">
                                                                <span style="width:100%;display:block">
                                                                    <strong>Contact us</strong><br>
                                                                    <span style="font-size:15px">${setting.contactNumber}</span>
                                                                    <br>
                                                                    <span style="font-size:15px">
                                                                        <a href="mailto:${setting.contactEmail}"
                                                                            target="_blank">${setting.contactEmail}</a>
                                                                    </span>
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
    }
}

module.exports = { sendEmail, customerEmail };