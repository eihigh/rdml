/// <reference path="types.ts" />
/// <reference path="eventcommands.ts" />

namespace rdml {
  export function execProc(i: Game_Interpreter, name: string) {
    const cmds = procs[name].cmds;
    i.setupChild(cmds, 0);
  }

  export function makeProc(elem: Element) {
    const name = elem.attrs["name"];
    procs[name] = new Proc(elem);
  }

  let procs: { [name: string]: Proc } = {};

  class Proc {
    cmds: EventCmd[] = [];
    constructor(root: Element) {
      root.children.map((child) => {
        pushCommand(this.cmds, child, 0);
      });
    }
  }
}
