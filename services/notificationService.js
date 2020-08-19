const { default: axios } = require('axios');

const sendNotification = (to, message) => {
    // TODO:: Implement Push notification
    var data = { 
        "notification": { 
            "title": message && message.title ? message.title : "title",
            "body": message && message.body ? message.body : "body"
        }, 
        "priority": "high", 
        "data": { 
            "click_action": "FLUTTER_NOTIFICATION_CLICK", 
            "id": "1", 
            "status": "done" 
        }, 
        "to": to
    };

    var config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer AAAAuinWob8:APA91bGGnIyMA3PlfpIS5rNm-4Lno_VkSFpQqjBC2M_7AHzm0dMruhYcJW2R6xUPM1xWAyDkGZpGeBg7SSX-tYIrtIkdHo8U-dwfNqUJyBImH_vGA15tPIvJpWSMMkx_04o5vhqUPkO1'
        }
    };

    axios.post("https://fcm.googleapis.com/fcm/send", data, config).catch((err) => {
        console.log({ err })
    }).then((res) => {
        console.log(res.status);
    });
    console.log("notification", to, message)
}

module.exports = { sendNotification };