const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("../logger");
const {BaseEntity} = require("./BaseEntity");

module.exports.UserEntity = class extends BaseEntity {

    /**
     *
     * @param {auth.UserRecord} userRecord
     */
    constructor(userRecord) {

        const {
            uid,
            email,
            emailVerified,
            displayName,
            disabled,
            creationTime,
            lastSignInTime,
            lastRefreshTime,
        } = userRecord;
        const data = {
            uid,
            email,
            emailVerified,
            displayName,
            disabled,
            creationTime,
            lastSignInTime,
            lastRefreshTime,
        };
        const key = datastore.key(["User", uid]);
        super("User", data, {ancestor: null, key: key});
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    exists = async () => {
        try {
            const query = datastore
                .createQuery(this.kind)
                .filter("uid", "=", this.data.uid)
                .filter("email", "=", this.data.email)

            const [votes] = await datastore.runQuery(query);
            return (votes.length > 0);
        } catch (e) {
            logger.error(e);
        }
    }
}
