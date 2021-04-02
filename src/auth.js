const FirebaseAuth = require('restify-firebase-auth').default;
const admin = require('firebase-admin');

const logger = require("./logger");

const fbKey = JSON.parse(process.env.FIREBASE_KEY);

logger.info(fbKey);

const credential = admin.credential.cert({
    projectId: fbKey["project_id"], // I get no error here
    clientEmail: fbKey["client_email"], // I get no error here
    privateKey: fbKey["private_key"].replace(/\\n/g, '\n') // NOW THIS WORKS!!!
});

module.exports = FirebaseAuth({firebase: admin.initializeApp({credential: credential })});