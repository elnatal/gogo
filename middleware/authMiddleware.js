const Token = require("../models/Token");

module.exports = (roles) => {
    return (req, res, next) => {
        var enabledRoles = [];

        if (roles && typeof(roles) == typeof([]) && roles.length) {
            enabledRoles = roles;
        }
        if (req.query.token) {
            Token.findById(req.query.token, (err, token) => {
                if (token && token.active && enabledRoles.includes(token.role)) {
                    next();
                } else {
                    res.status(401).send("UNAUTHORIZED");
                }
            })
        } else {
            res.status(401).send("UNAUTHORIZED");
        }
    }
}