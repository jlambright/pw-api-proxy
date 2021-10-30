const fbAdmin = require("firebase-admin");
const FirebaseAuth = require('restify-firebase-auth').default;
const escapeJSON = require("escape-json-node");

const logger = require("./logger");

const firebaseServiceAccount = JSON.parse(escapeJSON(process.env.FIREBASE_KEY));
const firebaseCert = fbAdmin.credential.cert(firebaseServiceAccount);

const admin = fbAdmin.initializeApp({
    credential: firebaseCert,
});

const firebaseAuth = FirebaseAuth({firebase: admin});

/**
 * @param {int} batchSize
 * @param {string?} nextPageToken
 **/
const listAllUsers = async (batchSize, nextPageToken) => {
    try {
        return await admin.auth().listUsers(batchSize, nextPageToken)
    } catch (err) {
        logger.error(err);
    }
};

module.exports = {
    admin,
    firebaseAuth,
    listAllUsers,
};
