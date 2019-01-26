/// <reference path="types.ts" />
/// <reference path="eventcommand.ts" />

namespace rdml {

  /*
   * proc: event procedure
   * called as common event
   */

  export function call(i: Game_Interpreter, id: string) {
    const cmds: EventCmd[] = procs[id].cmds;
    i.setupChild(cmds, 0);
  }

  export let procs: { [id: string]: Proc } = {};

  export class Proc {
    cmds: EventCmd[] = [];
    lastCmd: EventCmd | null = null;
    children: { [id: string]: Proc } = {};

    constructor(root: Element, depth: number) {
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
