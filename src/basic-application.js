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

const basename = path => path.split('/').reverse()[0];

const pathname = path => {
  const split = path.split('/');
  split.splice(split.length - 1, 1);
  return split.join('/');
};

/**
 * Basic Application Helper
 *
 * @desc A class for helping creating basic applications with open/load/create functionality.
 */
class BasicApplication extends EventHandler {

  constructor(core, proc, win, options) {
    super('BasicApplication<' + proc.name + '>');

    this.core = core;
    this.proc = proc;
    this.win = win;

    this.options = Object.assign({
      mimeTypes: proc.metadata.mimes || [],
      defaultFilename: 'New File'
    }, options);
  }

  destroy() {
    this.off();
  }

  init() {
    if (this.proc.args.path) {
      this.open({
        path: this.proc.args.path
      });
    } else {
      this.create();
    }

    return Promise.resolve(true);
  }

  getDialogOptions(type) {
    const {path} = this.proc.args;
    const {defaultFilename} = this.options;
    const defaultPath = this.core.config('vfs.defaultPath');

    return [{
      type,
      mime: this.options.mimeTypes,
      filename: path ? basename(path) : defaultFilename,
      path: path ? pathname(path) : defaultPath
    }, {
      parent: this.win,
      attributes: {
        modal: true
      }
    }];
  }

  updateWindowTitle() {
    if (this.win) {
      const {translatableFlat} = this.core.make('osjs/locale');
      const prefix = translatableFlat(this.proc.metadata.title);
      const title = this.proc.args.path
        ? basename(this.proc.args.path)
        : this.options.defaultFilename;

      this.win.setTitle(`${prefix} - ${title}`);
    }
  }

  createDialog(type, cb) {
    const [args, options] = this.getDialogOptions(type);

    this.core.make('osjs/dialog', 'file', args, options, (btn, item) => {
      if (btn === 'ok') {
        cb(item);
      }
    });
  }

  open(item) {
    this.proc.args.path = item.path;

    this.emit('open-file', item)

    this.updateWindowTitle();
  }

  save(item) {
    this.proc.args.path = item.path;

    this.emit('save-file', item);

    this.updateWindowTitle();
  }

  create() {
    this.proc.args.path = null;

    this.emit('new-file');

    this.updateWindowTitle();
  }

  createNew() {
    this.create();
  }

  createSaveDialog() {
    this.createDialog('save', item => this.save(item));
  }

  createOpenDialog() {
    this.createDialog('load', item => this.open(item));
  }
}

module.exports = BasicApplication;
