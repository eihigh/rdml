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
    const args = makeArgs(elem);
    const desc = commandDescs[elem.name]; // already checked
    desc.process(cmds, elem, args, depth);
  }

  function makeArgs(elem: Element) {
    if (!(elem.name in commandDescs)) {
      throw new Error(`unknown command "${elem.name}"`);
    }

    let args: Args = {};
    const cmd = commandDescs[elem.name];

    for (const argDesc of cmd.args) {
      let typ: ValueType | null = null;
      for (const attr in argDesc.attrs) {
        if (attr in elem.attrs) {
          typ = argDesc.attrs[attr];
        }
      }
      if (typ === null) { throw new Error(`unknown attribute`); }

      args["hoge"] = {
        attr: "",
        values: typ.filter(elem.attrs["hoge"]),
      }
    }
    //
    // for (const attr of cmd.args) {
    //   if (attr.subs !== undefined) {
    //     continue;
    //   }
    //
    //   // TODO extra keys check
    //   const key = attr.key === undefined ? attr.typ.name : attr.key;
    //   if (attr.default === REQUIRED && !(key in elem.attrs)) {
    //     throw new Error(`attribute "${key}" required, but not found"`);
    //   }
    //   const values = (attr.default === REQUIRED || key in elem.attrs)
    //     ? attr.typ.filter(elem.attrs[key]) : attr.default;
    //
    //   args[key] = {
    //     attr: "",
    //     values: values,
    //   };
    // }
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
    key: string;
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

  interface tkoolParamDesc {
    key: string;
    index?: number;
  }

  const toSingleCommand = (code: number, params: tkoolParamDesc[]): Processor => {
    return (c: Cmds, e: Element, a: Args, d: number) => {
      const result: Param[] = params.map<Param>((param) => {
        const i = param.index === undefined ? 0 : param.index;
        return a[param.key].values[i];
      });

      c.push({
        code: code,
        indent: d,
        parameters: result,
      });
    }
  }

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

  // utility
  function appendTemp(a: Args, key: string, val: Param) {
    a[key] = {
      attr: "",
      values: [val],
    };
  }

  const commandDescs: { [name: string]: CommandDesc } = {
    wait: {
      desc: "指定時間待機します。",
      args: [
        {
          desc: "待機時間",
          key: "time",
          attrs: { time: types.time },
          default: REQUIRED,
        },
      ],
      process: toSingleCommand(230, [
        { key: "time" },
      ]),
    },

    get: {
      desc: "所持品を増やします。",
      args: [
        {
          desc: "入手するものの種類と名前",
          key: "target",
          attrs: {
            item: types.n,
            weapon: types.n,
            armor: types.n,
          },
          default: REQUIRED,
        },
        {
          desc: "入手する数",
          key: "num",
          attrs: {
            n: types.n,
            n_var: types.var,
          },
          default: [1],
        },
      ],
      process: toSingleCommand(320, []),
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
          key: "n",
          attrs: {
            n: types.n,
            "var": types.var,
          },
          default: REQUIRED,
        },
      ],
      process: (c: Cmds, e: Element, a: Args, d: number) => {
        const code = ((): number => {
          switch (a["actor"].attr) {
            case "hp":
              return 311;
            case "mp":
              return 312;
          }
          // case "tp":
          return 326;
        })();

        appendTemp(a, "refers", a["n"].attr === "n_var" ? 1 : 0);

        toSingleCommand(code, [
          { key: "refers" },
          { key: "actor" },
          { key: "op" },
        ])(c, e, a, d);
      },
    },
  };
}
