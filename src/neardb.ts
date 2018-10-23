import { IConfig, PathItem, PathList, ISetOptions } from './types'
import { uuid } from './utils'

const defaultConfig: IConfig = {
  storage: {}
}

export default class NearDB {
  /** Config that is used to init NearDB */
  config: IConfig

  /** Data path that is used to interact with storage */
  path: PathList
  /**
   * Constructor to setup config, and path, and required checks.
   * @param config configuration to initiatlize NearDB instance
   * @param path current path of NearDB, sets to an empty array if nothing is passed
   */
  constructor(config: IConfig, path?: PathList) {
    /** Check if config exists */
    if (!config) throw new Error('No config passed to NearDB')
    /** Check if there is a storage set up */
    if (!config.storage) throw new Error('No Storage driver')
    /** Overwrites config param with default configuration */
    this.config = Object.assign(defaultConfig, config)
    // Sets empty path type
    if (!path) path = []
    this.path = path
  }

  /**
   * Static method to create a new instance of NearDB class.
   * @param config configuration to initiatlize NearDB instance
   * @returns an initialized instance of NearDB with the config
   */

  static database(config: IConfig) {
    return new NearDB(config)
  }

  /**
   * Sets a collection within the path
   * @param key expects key for collection
   * @returns an instance of NearDB with the new path and existing config
   */

  collection(key: string): NearDB {
    // Copy value of path before passing, to avoid poluting scope
    let newPath = [...this.path]

    const lastPathIndex = newPath[newPath.length - 1]
    // Cannot get a sub-collection of a collection
    if (lastPathIndex && lastPathIndex.type === 'collection') {
      throw new Error('Only documents can have sub-collections')
    }

    newPath.push({
      type: 'collection',
      key
    })

    return new NearDB(this.config, newPath)
  }

  doc(key: string) {
    // Copy value of path before passing, to avoid poluting this scope
    let newPath = [...this.path]

    const lastPathIndex = newPath[newPath.length - 1]
    // Cannot get a sub-collection of a collection
    if (lastPathIndex && lastPathIndex.type === 'doc') {
      throw new Error('Cannot add documents to documents')
    }

    newPath.push({
      type: 'doc',
      key
    })

    return new NearDB(this.config, newPath)
  }

  get() {
    return new Promise((resolve, reject) => {
      let { storage } = this.config
      let storageRef = storage

      const lastPathIndex = this.path[this.path.length - 1]
      // Cannot get a sub-collection of a collection
      if (lastPathIndex && lastPathIndex.type === 'collection') {
        throw new Error('Cannot get collections')
      }

      // Traverse the path to set the value
      this.path.forEach((item, index) => {
        // Check if key exists in storage, or set as an empty value
        if (storageRef && storageRef[item.key]) {
          storageRef = storageRef[item.key]
        } else {
          storageRef = storageRef[item.key] = {}
        }
        // If its the last item on path set the value and return
        if (index === this.path.length - 1) {
          storageRef = storageRef[item.key]
          resolve(storageRef)
        }
      })
    })
  }

  set(value: object, options?: ISetOptions) {
    return new Promise((resolve, reject) => {
      let { storage } = this.config
      let storageRef = storage

      // Traverse the path to set the value
      this.path.forEach((item, index) => {
        // Check if key exists in storage, or set as an empty value
        if (storageRef && storageRef[item.key]) {
          storageRef = storageRef[item.key]
        } else {
          storageRef = storageRef[item.key] = {}
        }
        // If its the last item on path set the value and return
        if (index === this.path.length - 1) {
          if (options && options.merge) {
            storageRef = Object.assign(storageRef[item.key], value)
          } else {
            storageRef = storageRef[item.key] = value
          }

          resolve(storageRef)
        }
      })
    })
  }

  add(value: object) {
    return new Promise((resolve, reject) => {
      let { storage } = this.config
      let storageRef = storage
      const lastPathIndex = this.path[this.path.length - 1]
      if (lastPathIndex && lastPathIndex.type !== 'collection') {
        reject(new Error('Can only add document to collections'))
      }

      // Traverse the path to set the value
      this.path.forEach((item, index) => {
        // Check if key exists in storage, or set as an empty value
        if (storageRef && storageRef[item.key]) {
          storageRef = storageRef[item.key]
        } else {
          // If key is in path, but doesnt exist create it
          storageRef = storageRef[item.key] = {}
        }
        // If its the last item on path set the value and return
        if (index === this.path.length - 1) {
          storageRef = storageRef[item.key][uuid()] = value

          resolve(storageRef)
        }
      })
    })
  }

  update() {}
}
