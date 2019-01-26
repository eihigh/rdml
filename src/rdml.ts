/// <reference path="doc.ts" />
/// <reference path="loader.ts" />
/// <reference path="event.ts" />

(() => {

  // return; // for testing

  // helpers
  const pluginName = "RDML";
  let params: any = {};

  const paramString = (keys: string[]): string => {
    for (const key of keys) {
      const value = PluginManager.parameters(pluginName)[key];
      if (value) { return value; }
    }
    return '';
  }

  // load all files
  try {
    const paths = JSON.parse(paramString(["paths"])) as string[];
    if (!paths) { throw new Error(); }
    rdml.load(paths);
  } catch (e) {
    throw new Error(`invalid parameter: RDML.paths`);
  }

  // define plugin command
  const __pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(cmd: string, args: string[]) {

    __pluginCommand.call(this, cmd, args);
    if (cmd !== "rdml") { return; }

    const subcmd = args[0];
    switch (subcmd) {
      case "proc":
        rdml.execProc(this, args[1]);
        break;
    }
  }

  // load waiting
  const __updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
  Game_Interpreter.prototype.updateWaitMode = function(): boolean {
    if (this._waitMode === "rdml loading") {
      if (rdml.hasLoaded()) {
        this._waitMode = "";
        return false;
      }
      return true;
    }
    return __updateWaitMode.call(this);
  }

  // set load waiting mode (CONFLICTABLE)
  const __initialize = Game_Interpreter.prototype.initialize;
  Game_Interpreter.prototype.initialize = function(depth) {
    __initialize.call(this, depth);
    if (!rdml.hasLoaded()) {
      this._waitMode = "rdml loading";
    }
  }
})();
