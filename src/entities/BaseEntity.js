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
     * @param {object=} options
     * @param {string[]} [options.ancestor = null] - String representation of the parent/ancestor key of the entity.
     * @param {string[]} [options.key = null] - String representation of the entity's key, not including ancestor.
     */
    constructor(kind, data, options) {
        const {ancestor, key} = options;

        super(BaseEntity, ["exists"]); //Ensures that all super classes employ a .exists() method.
        this.ancestorPath = ancestor || null;
        this.data = data;
        this.kind = kind;
        this.keyPath = key ? key : [this.kind, uniqid()];

        if (this.ancestor) {
            this.ancestor = datastore.key(this.ancestorPath);
            this.key = datastore.key(this.ancestorPath.concat(this.keyPath));
        }
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
     * @return {Promise<entity>}
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