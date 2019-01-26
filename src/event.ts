/// <reference path="types.ts" />
/// <reference path="eventcommand.ts" />

namespace rdml {

  /*
   * proc: event procedure
   * called as common event
   */

  export function execProc(i: Game_Interpreter, id: string) {
    const cmds: EventCmd[] = procs[id].cmds;
    i.setupChild(cmds, 0);
  }

  export function makeProc(el: Element) {
    const name = el.attrs["name"];
    procs[name] = new Proc(el);
  }

  export let procs: { [id: string]: Proc } = {};

  export class Proc {
    cmds: EventCmd[] = [];
    lastCmd: EventCmd | null = null;
    children: { [id: string]: Proc } = {};

    constructor(root: Element) {
      this.parseBlock(root, 0);
    }

    parseBlock(parent: Element, depth: number) {

      for (const el of parent.children) {
        // TODO special cases

        let cmd = elem2cmd(el);
        cmd.indent = depth;
        this.cmds.push(cmd);
      }

      // push empty command
      this.cmds.push({
        code: 0,
        indent: depth,
        parameters: [],
      })
    }
  }
}
