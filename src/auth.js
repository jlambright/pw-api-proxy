const firebase = require('firebase/app');
const admin = require('firebase-admin');

const logger = require("./logger");

const fbKey = JSON.parse(process.env.FIREBASE_KEY);

const credential = admin.credential.cert({
    projectId: fbKey["project_id"], // I get no error here
    clientEmail: fbKey["client_email"], // I get no error here
    privateKey: fbKey["private_key"].replace(/\\n/g, '\n') // NOW THIS WORKS!!!
});

admin.initializeApp({credential: credential });
firebase.initializeApp({credential: credential});

module.exports.getUserFromToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        res.send(401);
        return false;
    } else {
        const authToken = authHeader.replace('Bearer ', '');
        return admin.auth().verifyIdToken(authToken)
            .then((decodedToken) => admin.auth().getUser(decodedToken.sub)
                .then((user) => {
                    req.set("user", user);
                    return next();
                })).catch((e) => {
                    logger.info(e);
                res.send(401);
                return false;
            })
    }
}