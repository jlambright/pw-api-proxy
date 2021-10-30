'use strict';

const {getToken} = require('restify-firebase-auth');
const {admin} = require("../pwFirebase");
const {UserEntity} = require("../entities/userEntity");
const logger = require("../logger");


module.exports.getUidFromAuthHeader = async (authHeader) => {

    try {
        const {uid} = await admin.auth().verifyIdToken(getToken(authHeader));
        const userRecord = await admin.auth().getUser(uid);
        const userEntity = new UserEntity(userRecord);

        if (!await userEntity.exists()) {
            await userEntity.commit(); //Add the userEntity to Datastore if it doesn't exist.
        }

        return uid;
    } catch (e) {
        logger.error(e);
    }

}