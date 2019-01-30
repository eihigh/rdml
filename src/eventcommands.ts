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

    for (const attr of cmd.attrs) {
      if (attr.subs !== undefined) {
        continue;
      }

      // TODO extra keys check
      const key = attr.key === undefined ? attr.typ.attr : attr.key;
      if (attr.default === REQUIRED && !(key in elem.attrs)) {
        throw new Error(`attribute "${key}" required, but not found"`);
      }
      const values = (attr.default === REQUIRED || key in elem.attrs)
        ? attr.typ.filter(elem.attrs[key]) : attr.default;

      args[key] = {
        sub: "",
        values: values,
      };
    }
    return args;
  }

  const REQUIRED = null;

  interface CommandDesc {
    desc: string;
    attrs: AttrDesc[];
    process: Processor;
  }

  interface AttrDesc {
    key?: string;
    typ: ParamType;
    subs?: SubAttrDesc[];
    default: Param[] | null;
  }

  interface SubAttrDesc {
    key: string;
    typ: ParamType;
  }

  type Processor = (c: Cmds, e: Element, a: Args, depth: number) => void;

  interface Arg {
    sub: string;
    values: Param[];
  }

  type Args = { [attr: string]: Arg };

  interface ParamType {
    desc: string;
    attr: string;
    filter: Filter;
  }

  type Filter = (src: string) => Param[];

  const commandDescs: { [name: string]: CommandDesc } = {};
}
