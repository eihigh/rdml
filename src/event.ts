/// <reference path="rdml.ts" />
/// <reference path="parser.ts" />

namespace rdml {

  /*
   * proc: event procedure
   * called as common event
   */

  export function call(i: Game_Interpreter, id: string) {
    // const cmds: MVCmd[] = procs[id].cmds;
    // i.setupChild(cmds, 0);
  }

  export let procs: { [id: string]: Proc } = {};

  export type Param = string | number | boolean | number[];

  interface EventCmd {
    code: number;
    indent: number;
    parameters: Param[];
  }

  export class Proc {
    cmds: EventCmd[] = [];
    lastCmd: EventCmd | null = null;
    children: { [id: string]: Proc } = {};

    constructor(parent: Element, depth: number) {
      for (const c of parent.children) {

        // special elements
        switch (c.name) {
          case "m":
            this.parseMessage(c, depth);
            continue;
          case "choice":
          case "else":
        }

      }

      // push empty command
      this.cmds.push({
        code: 0,
        indent: depth,
        parameters: [],
      });
    }

    parseMessage(parent: Element, depth: number) {

      let blanks = 0;
      const lines = parent.data.split(/\r\n|\r|\n/);
      const pushHeader = () => {
        // TODO other options
        this.cmds.push({
          code: 101,
          indent: depth,
          parameters: ["", 0, 0, 2],
        });
      }

      for (const line of lines) {
        const t = line.trim();
        if (t === "") {
          blanks++;
          continue;
        }
      }
    }
  }
}
