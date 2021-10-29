'use strict';

const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("../logger");
const {BaseEntity} = require("./BaseEntity");

module.exports.MatchUpEntity = class extends BaseEntity {

    /**
     * @param {string} matchUpID
     * @param {string} roundID
     * @param {object} matchUpObj - Return object from MatchUpsCollection.item();
     */
    constructor(matchUpID, roundID, matchUpObj) {
        const {update, remove, voters, ...data} = matchUpObj;
        const ancestor = ["Round", roundID];
        const key = ["MatchUp", matchUpID]
        super("MatchUp", data, {ancestor, key});
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    exists = async () => {
        try {

            const query = datastore
                .createQuery(this.kind).hasAncestor(this.ancestor)
                .filter("_id", "=", this.data._id).select("__key__");

            const [votes] = await datastore.runQuery(query);
            return (votes.length > 0);
        } catch (e) {
            logger.error(e);
        }
    }
}