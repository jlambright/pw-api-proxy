const AbstractClass = require("abstract-class-js");

const {Datastore} = require("@google-cloud/datastore");
const {entity} = require("@google-cloud/datastore/build/src/entity");
const datastore = new Datastore();

const uniqid = require("uniqid");

const {createEntity} = require("./helpers");
const logger = require("../logger");

module.exports.BaseEntity = class extends AbstractClass {
    ancestor;
    data;
    key;
    kind;


    /**
     *
     * @param {string} kind
     * @param {object} data
     * @param {object} options
     * @param {entity.Key} options.ancestor
     * @param {entity.Key} options.key
     */
    constructor(kind, data, options = {ancestor: null, key: null}) {
        const {ancestor, key} = options;

        super(BaseEntity, ["exists"]); //Ensures that all super classes employ a .exists() method.
        this.ancestor = ancestor ? ancestor : null;
        this.data = data;
        this.kind = kind;
        this.key = key ? key : datastore.key([this.kind, uniqid()]);
    }

    /**
     *
     * @return {Promise<Object|{response: google.datastore.v1.ICommitResponse[], conflict: boolean}>}
     */
    commit = async () => {
        try {
            if (!await this.exists()) {
                return await createEntity({key: this.key, data: this.data});
            } else return await this.get();
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @return {Promise<object>}
     */
    get = async () => {
        try {
            const [entity] = await datastore.get(this.key);
            return entity;
        } catch (e) {
            logger.error(e);
        }
    }
}