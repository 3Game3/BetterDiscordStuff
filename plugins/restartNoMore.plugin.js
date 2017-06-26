//META{"name":"restartNoMore"}*//;
var restartNoMore;

restartNoMore = (function() {
  var EOL, cacheFile, crypto, end, execJs, fs, getDisplayName, getHeader, getMd5, load, log, patchSettingsPanel, path, start, unload;

  class restartNoMore {
    getName() {
      return "Restart-No-More";
    }

    getDescription() {
      return "Abandons the need for restarting/reloading discord to get your new plugins and themes. Especially useful for development.";
    }

    getVersion() {
      return "0.0.1-alpha";
    }

    getAuthor() {
      return "square";
    }

    constructor() {
      this.pPlugins = (function() {
        switch (process.platform) {
          case "win32":
            return path.resolve(process.env.appdata, "BetterDiscord/plugins/");
          case "darwin":
            return path.resolve(process.env.HOME, "Library/Preferences/", "BetterDiscord/plugins/");
          default:
            return path.resolve(process.env.HOME, ".config/", "BetterDiscord/plugins/");
        }
      })();
      this.pThemes = (function() {
        switch (process.platform) {
          case "win32":
            return path.resolve(process.env.appdata, "BetterDiscord/themes/");
          case "darwin":
            return path.resolve(process.env.HOME, "Library/Preferences/", "BetterDiscord/themes/");
          default:
            return path.resolve(process.env.HOME, ".config/", "BetterDiscord/themes/");
        }
      })();
      this._inProcess = {};
      this._nameCache = {};
      this._md5Cache = {};
      cacheFile = cacheFile.bind(this);
      unload = unload.bind(this);
      load = load.bind(this);
      start = start.bind(this);
      end = end.bind(this);
      log = log.bind(this);
      fs.readdir(this.pPlugins, (e, files) => {
        var f, j, len, results;
        if (e) {
          log(e);
        }
        if (files) {
          results = [];
          for (j = 0, len = files.length; j < len; j++) {
            f = files[j];
            results.push(cacheFile(true, path.resolve(this.pPlugins, f)));
          }
          return results;
        }
      });
      fs.readdir(this.pThemes, (e, files) => {
        var f, j, len, results;
        if (e) {
          log(e);
        }
        if (files) {
          results = [];
          for (j = 0, len = files.length; j < len; j++) {
            f = files[j];
            results.push(cacheFile(true, path.resolve(this.pThemes, f)));
          }
          return results;
        }
      });
    }

    load() {}

    start() {
      var k, plugin, results;
      this.wPlugins = fs.watch(this.pPlugins, {
        persistent: false
      }, (type, filename) => {
        if (filename != null) {
          return cacheFile(path.resolve(this.pPlugins, filename));
        }
      });
      this.wThemes = fs.watch(this.pThemes, {
        persistent: false
      }, (type, filename) => {
        if (filename != null) {
          return cacheFile(path.resolve(this.pThemes, filename));
        }
      });
      if (this.wPlugins == null) {
        log("Couldn't initialize plugins watcher");
      }
      if (this.wThemes == null) {
        log("Couldn't initialize themes watcher");
      }
      results = [];
      for (k in bdplugins) {
        ({plugin} = bdplugins[k]);
        results.push((function(k, plugin) {
          return patchSettingsPanel(plugin);
        })(k, plugin));
      }
      return results;
    }

    stop() {
      var k, plugin, results;
      this.wPlugins.close();
      this.wThemes.close();
      results = [];
      for (k in bdplugins) {
        ({plugin} = bdplugins[k]);
        results.push((function(k, plugin) {
          return patchSettingsPanel(plugin, true);
        })(k, plugin));
      }
      return results;
    }

    getSettingsPanel() {
      return "<button type=\"button\" onclick=\"restartNoMore.reloadAll()\">Reload all Plugins and Themes.</button>";
    }

    static reloadAll() {
      var _nameCache, k, r, v;
      ({_nameCache} = bdplugins[restartNoMore.prototype.getName()].plugin);
      for (k in _nameCache) {
        v = _nameCache[k];
        if (v.name === "restartNoMore") {
          unload((r = k), v.pname != null);
        }
      }
      for (k in _nameCache) {
        v = _nameCache[k];
        unload(k, v.pname != null);
        cacheFile(k);
      }
      return cacheFile(r);
    }

    static reload(name) {
      var _nameCache, k, v;
      ({_nameCache} = bdplugins[restartNoMore.prototype.getName()].plugin);
      for (k in _nameCache) {
        v = _nameCache[k];
        if (!(v.name === name)) {
          continue;
        }
        unload(k, v.pname != null);
        cacheFile(k);
        return;
      }
      log(`Couldn't determine filename for requested reload: ${name}.`);
    }

  };

  path = require("path");

  fs = require("fs");

  crypto = require("crypto");

  EOL = (require("os")).EOL;

  cacheFile = unload = load = start = end = log = null;

  cacheFile = function(init, filename) {
    var isPlugin;
    if (filename == null) {
      filename = init;
      init = false;
    }
    if (!((isPlugin = /\.plugin\.js$/.test(filename)) || /\.theme\.css$/.test(filename))) {
      return;
    }
    if (!start(filename)) {
      return;
    }
    return fs.lstat(filename, (e, stat) => {
      if ("ENOENT" === (e != null ? e.code : void 0)) {
        return end(filename, unload(filename, isPlugin));
      }
      if (e) {
        return end(filename, e);
      }
      if (!stat.isFile()) {
        return end(filename);
      }
      return setImmediate(() => {
        return fs.readFile(filename, "utf8", (e, data) => {
          var fnOld, header, k, md5, name, ref, ref1, v;
          if (e) {
            return end(filename, e);
          }
          if (!(header = getHeader(filename, data, isPlugin))) {
            return;
          }
          if (isPlugin) {
            header.pname = getDisplayName(header.name, data);
            if (header.pname == null) {
              return end(filename, `couldn't gather plugin name from ${filename}`);
            }
          }
          if (init) {
            this._nameCache[filename] = header;
            this._md5Cache[header.name] = getMd5(data);
            return end(filename);
          }
          md5 = getMd5(data);
          if ((this._nameCache[filename] == null) && (this._md5Cache[header.name] != null)) {
            ref = this._nameCache;
            for (k in ref) {
              v = ref[k];
              if (v.name === header.name) {
                fnOld = k;
                break;
              }
            }
            if (fnOld != null) {
              fs.lstat(fnOld, function(e) {
                if ("ENOENT" !== e.code) {
                  return end(filename, `Skipped loading ${filename} because ${fnOld} already registered ${header.name}.`);
                }
                log("# can this even be reached?");
                unload(fnOld, isPlugin);
                return end(filename, load(filename, data, isPlugin));
              });
            } else {
              return log("# shouldn't be reached.");
            }
          } else if (((name = (ref1 = this._nameCache[filename]) != null ? ref1.name : void 0) != null) && this._md5Cache[name] === md5) {
            return end(filename, `Skipped loading ${filename} because it's unchanged.`);
          } else if (this._nameCache[filename] != null) {
            unload(filename, isPlugin);
          }
          this._nameCache[filename] = header;
          this._md5Cache[header.name] = md5;
          return end(filename, load(filename, data, isPlugin));
        });
      });
    });
  };

  getHeader = function(filename, data, isPlugin) {
    var e, header;
    try {
      header = data.slice(0, data.indexOf(EOL));
      header = header.slice(6 + header.lastIndexOf("/\/ME" + "TA"), header.lastIndexOf("*/\/"));
      header = JSON.parse(header);
    } catch (error) {
      e = error;
      end(filename, e);
      return false;
    }
    if ((header.name == null) && (isPlugin || !((header.author != null) && (header.description != null) && (header.version != null)))) {
      end(filename, "Invalid META header in " + filename);
      return false;
    }
    return header;
  };

  getMd5 = function(data) {
    var md5;
    md5 = crypto.createHash("md5");
    md5.update(data);
    return md5.digest("hex");
  };

  getDisplayName = function(name, data) {
    var m, pp;
    pp = "[\\s\\S]";
    if ((m = data.match(RegExp(`^${pp}*?(?:\\r?\\n)${pp}*?${name}${pp}*?getName${pp}+?('|\")((?:\\\\\\1|[^\\1])*?)\\1`))) != null) {
      return m[2].split("\\" + m[1]).join(m[1]);
    }
  };

  unload = function(filename, isPlugin) {
    var header, p, t;
    if (isPlugin !== !!isPlugin) {
      return log(new Error("Usage Error: isPlugin not provided."));
    }
    header = this._nameCache[filename];
    if (isPlugin) {
      p = bdplugins[header.pname].plugin;
      if (pluginCookie[header.pname]) {
        p.stop();
      }
      try {
        if (typeof p.unload === "function") {
          p.unload();
        }
      } catch (error) {}
      delete (typeof window !== "undefined" && window !== null ? window : global)[header.name];
      delete bdplugins[header.pname];
    } else {
      t = bdthemes[header.name];
      if (themeCookie[header.name]) {
        document.querySelector(`#${header.name}`).remove();
      }
      delete bdthemes[header.name];
    }
    delete this._md5Cache[header.name];
    delete this._nameCache[filename];
    return log(`Unloaded ${filename}`);
  };

  load = function(filename, data, isPlugin) {
    var header, n;
    header = this._nameCache[filename];
    if (isPlugin) {
      return execJs(`(function(){${data}\r\n})()`, () => {
        return execJs(`new ${header.name}`, (plugin) => {
          bdplugins[header.pname] = {
            plugin: plugin,
            enabled: false
          };
          if (header.pname in pluginCookie && pluginCookie[header.pname]) {
            plugin.start();
          } else {
            pluginCookie[header.pname] = false;
            pluginModule.savePluginData();
          }
          patchSettingsPanel(plugin);
          return log(`Loaded ${filename}`);
        });
      });
    } else {
      data = data.split(EOL);
      data.shift();
      data = data.join("");
      bdthemes[header.name] = {
        name: header.name,
        description: header.description,
        author: header.author,
        version: header.version,
        css: escape(data),
        enabled: false
      };
      if (header.name in themeCookie && themeCookie[header.name]) {
        n = document.createElement("style");
        n.id = header.name;
        n.innerHTML = data;
        document.head.appendChild(n);
      } else {
        themeCookie[header.name] = false;
        themeModule.saveThemeData();
      }
      return log(`Loaded ${filename}`);
    }
  };

  execJs = function(js, cb) {
    return cb(eval.call(typeof window !== "undefined" && window !== null ? window : global, js));
  };

  patchSettingsPanel = function(plugin, remove = false) {
    var base, o;
    switch (typeof (typeof (base = (o = plugin.getSettingsPanel)) === "function" ? base(remove) : void 0)) {
      case "undefined":
      case "string":
        return plugin.getSettingsPanel = function(remove) {
          if (!!remove === remove) {
            if (remove) {
              plugin.getSettingsPanel = o;
            }
            return 42;
          }
          return ((o != null ? o.apply : void 0) ? (o.apply(plugin, arguments)) + "<br>" : "") + `<button type=\"button\" onclick=\"restartNoMore.reload('${plugin.constructor.name}')\">Reload with Restart-No-More</button>`;
        };
    }
  };

  start = function(filename) {
    var color, i, j, l, n, ref, text;
    if (typeof yoyorainbow !== "undefined" && yoyorainbow !== null) {
      text = "yo";
      color = "";
      n = 10 * Math.random() + 3;
      for (i = j = 0, ref = n; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        if (n < 5) {
          text = "yo" + text.slice(0, 0 | text.length / 2) + text;
        } else {
          text = "Yo" + text;
        }
      }
      for (i = l = 0; l < 6; i = ++l) {
        n = 0 | Math.random() * 16;
        if (9 < n) {
          n = String.fromCharCode(n + 87);
        }
        color += n;
      }
      console.log(`%c${text}`, `color:#${color}`);
    }
    if (this._inProcess[filename]) {
      return false;
    }
    return this._inProcess[filename] = true;
  };

  end = function(filename, e) {
    delete this._inProcess[filename];
    if ((e instanceof Error) || "string" === typeof e) {
      return log(e);
    }
  };

  log = function(...text) {
    return console.log(`%c${this.getName()}: %c${text[0]}`, "color:#7e0e46;font-size:1.3em;font-weight:bold", ((text[0] instanceof Error) ? "" : "color:#005900;font-size:1.3em"), ...text.slice(1), "\t" + (new Date).toLocaleTimeString());
  };

  return restartNoMore;

})();

(typeof window !== "undefined" && window !== null ? window : global).restartNoMore = restartNoMore;
