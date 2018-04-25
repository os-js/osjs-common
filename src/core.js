/*
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

const EventHandler = require('./event-handler.js');
const merge = require('deepmerge');

const resolveTreeByKey = (tree, key, defaultValue) => {
  let result;

  try {
    result = key
      .split(/\./g)
      .reduce((result, key) => result[key], Object.assign({}, tree));
  } catch (e) { /* noop */ }

  return typeof result === 'undefined' ? defaultValue : result;
};

const loadProviders = async (providers, filter) => {
  const list = providers
    .filter(filter)
    .map(({provider}) => provider);

  console.log('Loading', list.length, 'providers');

  try {
    for (let i = 0; i < list.length; i++) {
      try {
        await list[i].init();
      } catch (e) {
        console.warn(e);
      }
    }
  } catch (e) {
    console.error(e);
    console.groupEnd();

    return false;
  }

  list.forEach(p => p.start());

  return true;
};

/**
 * Core
 *
 * @desc Main class for OS.js service providers and bootstrapping.
 */
class Core extends EventHandler {

  /**
   * Create core instance
   * @param {Object} defaultConfiguration Default configuration
   * @param {Object} configuration Configuration given
   * @param {Object} options Options
   */
  constructor(name, defaultConfiguration, configuration, options) {
    super(name);

    const merger = merge.default ? merge.default : merge; // NOTE: Why ?!
    this.configuration = merger(defaultConfiguration, configuration);
    this.options = options;
    this.providers = [];
    this.registry = [];
    this.instances = {};
    this.booted = false;
    this.started = false;
    this.destroyed = false;
  }

  /**
   * Destroy core instance
   */
  destroy() {
    if (this.destroyed) {
      return false;
    }
    this.destroyed = true;

    this.providers.forEach(({provider}) => provider.destroy());

    this.providers = [];
    this.instances = {};

    return true;
  }

  /**
   * Boots up OS.js
   */
  async boot() {
    if (this.booted) {
      return;
    }

    this.booted = true;

    await loadProviders(this.providers, ({options}) => options.before);
  }

  /**
   * Starts all core services
   */
  async start() {
    if (this.started) {
      return;
    }
    this.started = true;

    const result = await loadProviders(this.providers, ({options}) => !options.before);

    return result;
  }

  /**
   * Gets a configuration entry by key
   *
   * @param {String} key The key to get the value from
   * @param {*} [defaultValue] If result is undefined, return this instead
   * @see {resolveTreeByKey}
   * @return {*}
   */
  config(key, defaultValue) {
    return key
      ? resolveTreeByKey(this.configuration, key, defaultValue)
      : Object.assign({}, this.configuration);
  }

  /**
   * Register a service provider
   *
   * @param {Class} ref A class reference
   * @param {Object} [options] Options for handling of provider
   * @param {Boolean} [options.before] Load this provider early
   * @param {Object} [options.args] Arguments to send to the constructor
   */
  register(ref, options = {}) {
    try {
      const instance = new ref(this, options.args);
      this.providers.push({
        options,
        provider: instance
      });
    } catch (e) {
      console.error('Core::register()', e);
    }
  }

  /*
   * Wrapper for registering a service provider
   */
  _registerMethod(name, singleton, callback) {
    console.log(`Registering service provider: "${name}" (${singleton ? 'singleton' : 'instance'})`);

    this.registry.push({
      singleton,
      name,
      make(...args) {
        return callback(...args);
      }
    });
  }

  /**
   * Register a instanciator provider
   *
   * @param {String} name Provider name
   * @param {Function} callback Callback that returns an instance
   */
  instance(name, callback) {
    this._registerMethod(name, false, callback);
  }

  /**
   * Register a singleton provider
   *
   * @param {String} name Provider name
   * @param {Function} callback Callback that returns an instance
   */
  singleton(name, callback) {
    this._registerMethod(name, true, callback);
  }

  /**
   * Create an instance of a provided service
   *
   * @param {String} name Service name
   * @param {*} args Constructor arguments
   * @return {*} An instance of a service
   */
  make(name, ...args) {
    const found = this.registry.find(p => p.name === name);
    if (!found) {
      throw new Error(`Provider '${name}' not found`);
    }

    if (!found.singleton) {
      return found.make(...args);
    }

    if (!this.instances[name]) {
      if (found) {
        this.instances[name] = found.make(...args);
      }
    }

    return this.instances[name];
  }

  /**
   * Check if a service exists
   * @param {String} name Provider name
   * @return {Boolean}
   */
  has(name) {
    return this.registry.findIndex(p => p.name === name) !== -1;
  }
}

module.exports = Core;
