const {getToken} = require('restify-firebase-auth');
const {Admin} = require("../auth");


module.exports.getUidFromAuthHeader = async (authHeader) => {
    const decodedToken = await Admin.auth().verifyIdToken(getToken(authHeader));
    return decodedToken.uid;
}