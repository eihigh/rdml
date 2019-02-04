/// <reference path="types.ts" />
/// <reference path="check.ts" />

namespace rdml {

  type Cmds = EventCmd[];

  export function pushCommand(cmds: Cmds, elem: Element, depth: number) {
    const args = createArgs(elem);
    const desc = commandDefs[elem.name]; // already checked
    desc.process(cmds, elem, args, depth);
  }

  function createArgs(elem: Element) {
    if (!(elem.name in commandDefs)) {
      throw new Error(`unknown command "${elem.name}"`);
    }

    let args: Args = {};
    const cmd = commandDefs[elem.name];

    for (const arg of cmd.args) {
      const key =
        arg.key !== undefined ? arg.key
          : Object.keys(arg.attrs).length === 1 ? Object.keys(arg.attrs)[0]
            : null

      if (key === null) { throw new Error(`must key`); }

      const attr = findAttr(elem, arg);
      if (attr === null) { continue; }

      const typ = arg.attrs[attr];
      args[key] = new Arg(attr, typ.filter(elem.attrs[attr]));
    }
    return args;
  }

  function findAttr(elem: Element, arg: definition.Arg): string | null {
    for (const attr in arg.attrs) {
      if (attr in elem.attrs) { return attr; }
    }
    return null;
  }

  const REQUIRED = null;

  namespace definition {
    export interface Command {
      desc: string;
      args: Arg[];
      process: Processor;
    }

    export interface Arg {
      desc: string;
      key?: string;
      attrs: { [name: string]: ValueType };
      follows?: any[];
      default: DefaultValue | null;
    }

    export interface ValueType {
      filter: Filter;
      desc: string;
    }

    export interface DefaultValue {
      attr: string;
      value: string;
    }
  }

  export type Filter = (src: string) => Param[];

  export type Processor = (c: Cmds, e: Element, a: Args, depth: number) => void;

  class Arg {
    constructor(
      public attr: string,
      public values: Param[],
    ) { }
  }

  type Args = { [key: string]: Arg };

  /*
   * definitions
   */

  interface tkoolParamDesc {
    key: string;
    index?: number;
  }

  const pushSingleCommand = (code: number, params: tkoolParamDesc[]): Processor => {
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

    export function bool(): Filter {
      return (src: string) => [1];
    }
  }

  const types: { [name: string]: definition.ValueType } = {
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
    bool: {
      filter: f.bool(),
      desc: "真偽値",
    },
  }

  // utility
  function appendTemp(a: Args, key: string, val: Param) {
    a[key] = {
      attr: "",
      values: [val],
    };
  }

  const commandDefs: { [name: string]: definition.Command } = {
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
      process: pushSingleCommand(230, [
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
          default: {
            attr: "num",
            value: "0",
          },
        },
      ],
      process: pushSingleCommand(320, []),
    },

    heal: {
      desc: "アクターのパラメータを回復します。",
      args: [
        {
          desc: "回復するパラメータの種類と対象アクター",
          key: "actor",
          attrs: {
            hpof: types.actor,
            mpof: types.actor,
            tpof: types.actor,
          },
          default: REQUIRED,
        },
        {
          desc: "回復量 (直接指定 or 変数)",
          key: "n",
          attrs: {
            n: types.n,
            n_var: types.var,
          },
          default: REQUIRED,
        },
        {
          desc: "戦闘不能時の回復が可能か",
          attrs: {
            revive: types.bool,
          },
          follows: [
            { key: "actor", attr: "hpof" },
          ],
          default: { attr: "revive", value: "false" },
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

        pushSingleCommand(code, [
          { key: "refers" },
          { key: "actor" },
          { key: "op" },
        ])(c, e, a, d);
      },
    },
  };
}
