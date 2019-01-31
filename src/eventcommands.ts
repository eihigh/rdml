/// <reference path="types.ts" />
/// <reference path="check.ts" />

namespace rdml.eventcommands {

  type Cmds = EventCmd[];

  export function execProc(i: Game_Interpreter, id: string) {
    const cmds = procs[id].cmds;
    i.setupChild(cmds, 0);
  }

  export function makeProc(elem: Element) {
    const name = elem.attrs["name"];
    procs[name] = new Proc(elem);
  }

  let procs: { [name: string]: Proc } = {};

  class Proc {
    cmds: Cmds = [];
    constructor(root: Element) {
      root.children.map((child) => {
        pushCommand(this.cmds, child, 0);
      });
    }
  }

  function pushCommand(cmds: Cmds, elem: Element, depth: number) {
    const desc = commandDescs[elem.name];
    const args = makeArgs(elem);
    desc.process(cmds, elem, args, depth);
  }

  function makeArgs(elem: Element) {
    if (!(elem.name in commandDescs)) {
      throw new Error(`unknown command "${elem.name}"`);
    }

    let args: Args = {};
    const cmd = commandDescs[elem.name];

    for (const attr of cmd.args) {
      if (attr.subs !== undefined) {
        continue;
      }

      // TODO extra keys check
      const key = attr.key === undefined ? attr.typ.name : attr.key;
      if (attr.default === REQUIRED && !(key in elem.attrs)) {
        throw new Error(`attribute "${key}" required, but not found"`);
      }
      const values = (attr.default === REQUIRED || key in elem.attrs)
        ? attr.typ.filter(elem.attrs[key]) : attr.default;

      args[key] = {
        attr: "",
        values: values,
      };
    }
    return args;
  }

  const REQUIRED = null;

  interface CommandDesc {
    desc: string;
    args: ArgDesc[];
    process: Processor;
  }

  interface ArgDesc {
    desc: string;
    key?: string;
    attrs: { [name: string]: ValueType };
    default: Param[] | null;
  }

  type Processor = (c: Cmds, e: Element, a: Args, depth: number) => void;

  interface Arg {
    attr: string;
    values: Param[];
  }

  type Args = { [key: string]: Arg };

  interface ValueType {
    filter: Filter;
    desc: string;
  }

  type Filter = (src: string) => Param[];

  /*
   * definitions
   */

  namespace f {
    export function int(min: number | null, max: number | null): Filter {
      return (src: string) => [check.int(src, min, max)];
    }
  }

  const types: { [name: string]: ValueType } = {
    time: {
      filter: f.int(0, null),
      desc: "フレーム数",
    },
    n: {
      filter: f.int(0, null),
      desc: "整数値",
    },
    "var": {
      filter: f.int(0, null),
      desc: "変数名",
    },
    actor: {
      filter: f.int(0, null),
      desc: "アクター名",
    },
  }

  const commandDescs: { [name: string]: CommandDesc } = {
    wait: {
      desc: "指定時間待機します。",
      args: [
        {
          desc: "待機時間",
          attrs: { time: types.time },
          default: REQUIRED,
        },
      ],
      process: (c: Cmds, e: Element, a: Args, d: number) => { },
    },

    heal: {
      desc: "アクターのパラメータを回復します。",
      args: [
        {
          desc: "回復するパラメータの種類と対象アクター",
          key: "actor",
          attrs: {
            hp: types.actor,
            mp: types.actor,
            tp: types.actor,
          },
          default: REQUIRED,
        },
        {
          desc: "回復量 (直接指定 or 変数)",
          attrs: {
            n: types.n,
            "var": types.var,
          },
          default: REQUIRED,
        },
      ],
      process: (c: Cmds, e: Element, a: Args, d: number) => { },
    },
  };
}
